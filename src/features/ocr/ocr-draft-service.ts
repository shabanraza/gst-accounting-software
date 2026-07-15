import Decimal from 'decimal.js'

import { createItem } from '#/features/inventory/item-service.ts'
import { createParty } from '#/features/parties/party-service.ts'
import {
  postPurchaseBill,
  DuplicateSupplierBillError,
} from '#/features/purchases/purchase-bill-service.ts'
import { assertLedgerAccountsBelongToCompany } from '#/features/accounting/ledger-account-guards.ts'

import type { LedgerAccountRepository } from '#/features/accounting/chart-of-accounts.ts'
import type { DocumentAttachmentRepository } from '#/features/documents/document-attachment-service.ts'

import type { ItemRepository } from '#/features/inventory/item-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type {
  PurchaseBillDependencies,
  PurchaseBillRecord,
} from '#/features/purchases/purchase-bill-service.ts'

export type OcrFieldValue = {
  value: string
  confidence: number
}

export type OcrDraftFields = {
  supplierName: OcrFieldValue
  supplierGstin: OcrFieldValue
  billNumber: OcrFieldValue
  billDate: OcrFieldValue
  taxableAmount: OcrFieldValue
  gstAmount: OcrFieldValue
  totalAmount: OcrFieldValue
}

export type OcrDraftStatus = 'needs_review' | 'confirmed' | 'posted'

export type OcrDraftRecord = {
  id: string
  companyId: string
  attachmentId: string
  status: OcrDraftStatus
  fields: OcrDraftFields
  lowConfidenceFields: Array<keyof OcrDraftFields>
  postedPurchaseBillId: string | null
  reviewedByUserId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface OcrDraftRepository {
  create: (draft: OcrDraftRecord) => Promise<OcrDraftRecord>
  findById: (id: string) => Promise<OcrDraftRecord | null>
  save: (draft: OcrDraftRecord) => Promise<OcrDraftRecord>
  listByCompanyId: (companyId: string) => Promise<Array<OcrDraftRecord>>
}

export type OcrConfirmDependencies = PurchaseBillDependencies & {
  parties: PartyRepository
  items: ItemRepository
  ledgers: LedgerAccountRepository
}

export type ConfirmOcrDraftInput = {
  draftId: string
  companyId: string
  reviewedByUserId: string
  companyStateCode: string
  financialYearStart: string
  purchaseAccountId: string
  inputGstAccountId: string
  payableAccountId: string
  stockAccountId: string
}

const LOW_CONFIDENCE_THRESHOLD = 0.8
const OCR_ITEM_NAME = 'OCR Purchase'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function deriveGstRate(taxableAmount: string, gstAmount: string): string {
  const taxable = new Decimal(taxableAmount || '0')
  const gst = new Decimal(gstAmount || '0')
  if (taxable.lte(0)) return '0.00'
  return gst.mul(100).div(taxable).toFixed(2)
}

function dueDateFromBillDate(billDate: string): string {
  const date = new Date(`${billDate}T00:00:00`)
  date.setDate(date.getDate() + 30)
  return date.toISOString().slice(0, 10)
}

function stateCodeFromGstin(gstin: string): string {
  const code = gstin.slice(0, 2)
  return /^\d{2}$/.test(code) ? code : '27'
}

async function resolveOcrSupplier(
  parties: PartyRepository,
  input: {
    companyId: string
    supplierName: string
    supplierGstin: string
    payableAccountId: string
  },
) {
  const partyList = await parties.listByCompanyId(input.companyId)
  const gstin = input.supplierGstin.trim()
  const byGstin = gstin
    ? partyList.find(
        (party) => party.gstin?.toUpperCase() === gstin.toUpperCase(),
      )
    : null
  if (byGstin) return byGstin

  const byName = await parties.findByCompanyAndName(
    input.companyId,
    input.supplierName.trim(),
  )
  if (byName) return byName

  return createParty(parties, {
    companyId: input.companyId,
    name: input.supplierName.trim(),
    partyType: 'supplier',
    gstin: gstin || null,
    stateCode: gstin ? stateCodeFromGstin(gstin) : '27',
    creditLimit: null,
    paymentTermsDays: 30,
    payableAccountId: input.payableAccountId,
    receivableAccountId: null,
  })
}

async function resolveOcrItem(items: ItemRepository, companyId: string) {
  const existing = (await items.listByCompanyId(companyId)).find(
    (item) => item.name === OCR_ITEM_NAME,
  )
  if (existing) return existing

  return createItem(items, {
    companyId,
    name: OCR_ITEM_NAME,
    hsnCode: '9997',
    gstRate: '0.00',
    baseUnit: 'Nos',
    purchaseRate: '0.00',
    saleRate: '0.00',
    tracksInventory: false,
  })
}

export async function createOcrDraft(
  repository: OcrDraftRepository,
  attachments: DocumentAttachmentRepository,
  input: {
    companyId: string
    attachmentId: string
    fields: OcrDraftFields
  },
): Promise<OcrDraftRecord> {
  const attachment = await attachments.findById(input.attachmentId)
  if (!attachment || attachment.companyId !== input.companyId) {
    throw new Error('Attachment not found for company')
  }

  const lowConfidenceFields = (
    Object.entries(input.fields) as Array<[keyof OcrDraftFields, OcrFieldValue]>
  )
    .filter(([, field]) => field.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map(([key]) => key)

  const now = new Date()

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    attachmentId: input.attachmentId,
    status: 'needs_review',
    fields: input.fields,
    lowConfidenceFields,
    postedPurchaseBillId: null,
    reviewedByUserId: null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function confirmOcrDraft(
  repository: OcrDraftRepository,
  deps: OcrConfirmDependencies,
  input: ConfirmOcrDraftInput,
): Promise<OcrDraftRecord> {
  const draft = await repository.findById(input.draftId)

  if (!draft || draft.companyId !== input.companyId) {
    throw new Error('OCR draft not found for company')
  }

  if (draft.status === 'posted' && draft.postedPurchaseBillId) {
    return draft
  }

  await assertLedgerAccountsBelongToCompany(deps.ledgers, input.companyId, [
    input.purchaseAccountId,
    input.inputGstAccountId,
    input.payableAccountId,
    input.stockAccountId,
  ])

  const { fields } = draft
  const supplier = await resolveOcrSupplier(deps.parties, {
    companyId: input.companyId,
    supplierName: fields.supplierName.value,
    supplierGstin: fields.supplierGstin.value,
    payableAccountId: input.payableAccountId,
  })
  const item = await resolveOcrItem(deps.items, input.companyId)
  const gstRate = deriveGstRate(
    fields.taxableAmount.value,
    fields.gstAmount.value,
  )
  const billDate = fields.billDate.value
  const taxableAmount = fields.taxableAmount.value

  let bill: PurchaseBillRecord
  try {
    bill = await postPurchaseBill(deps, {
      companyId: input.companyId,
      companyStateCode: input.companyStateCode,
      financialYearStart: input.financialYearStart,
      supplierId: supplier.id,
      supplierStateCode: supplier.stateCode,
      supplierBillNumber: fields.billNumber.value,
      billDate,
      dueDate: dueDateFromBillDate(billDate),
      taxMode: 'exclusive',
      narration: `OCR purchase bill ${fields.billNumber.value}`,
      purchaseAccountId: input.purchaseAccountId,
      inputGstAccountId: input.inputGstAccountId,
      payableAccountId: input.payableAccountId,
      stockAccountId: input.stockAccountId,
      skipStockMovement: true,
      lines: [
        {
          itemId: item.id,
          description: `OCR import from ${fields.supplierName.value}`,
          quantity: '1',
          unit: item.baseUnit,
          rate: taxableAmount,
          gstRate,
        },
      ],
    })
  } catch (error) {
    if (error instanceof DuplicateSupplierBillError) {
      const existing = await deps.bills.findBySupplierBillNumber({
        companyId: input.companyId,
        supplierId: supplier.id,
        supplierBillNumber: fields.billNumber.value,
        financialYearStart: input.financialYearStart,
      })
      if (existing) {
        bill = existing
      } else {
        throw error
      }
    } else {
      throw error
    }
  }

  return repository.save({
    ...draft,
    status: 'posted',
    reviewedByUserId: input.reviewedByUserId,
    postedPurchaseBillId: bill.id,
    updatedAt: new Date(),
  })
}

export async function listOcrDraftsByCompany(
  repository: OcrDraftRepository,
  companyId: string,
): Promise<Array<OcrDraftRecord>> {
  return repository.listByCompanyId(companyId)
}

export async function updateOcrDraftFields(
  repository: OcrDraftRepository,
  input: {
    companyId: string
    draftId: string
    fields: OcrDraftFields
  },
): Promise<OcrDraftRecord> {
  const draft = await repository.findById(input.draftId)

  if (!draft || draft.companyId !== input.companyId) {
    throw new Error('OCR draft not found for company')
  }

  if (draft.status === 'posted') {
    throw new Error('Cannot edit posted OCR draft')
  }

  const lowConfidenceFields = (
    Object.entries(input.fields) as Array<[keyof OcrDraftFields, OcrFieldValue]>
  )
    .filter(([, field]) => field.confidence < LOW_CONFIDENCE_THRESHOLD)
    .map(([key]) => key)

  return repository.save({
    ...draft,
    fields: input.fields,
    lowConfidenceFields,
    updatedAt: new Date(),
  })
}
