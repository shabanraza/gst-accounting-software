import { describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { InMemoryItemRepository } from '#/features/inventory/inventory-store.ts'
import { InMemoryStockStore } from '#/features/inventory/inventory-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import {
  confirmOcrDraft,
  createOcrDraft,
} from '#/features/ocr/ocr-draft-service.ts'
import type {
  OcrDraftRecord,
  OcrDraftRepository,
} from '#/features/ocr/ocr-draft-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'

class InMemoryOcrDraftRepository implements OcrDraftRepository {
  private drafts: Array<OcrDraftRecord> = []

  async create(draft: OcrDraftRecord) {
    this.drafts.push(draft)
    return draft
  }

  async findById(id: string) {
    return this.drafts.find((draft) => draft.id === id) ?? null
  }

  async save(draft: OcrDraftRecord) {
    const index = this.drafts.findIndex((item) => item.id === draft.id)
    if (index >= 0) {
      this.drafts[index] = draft
    }
    return draft
  }

  async listByCompanyId(companyId: string) {
    return this.drafts.filter((draft) => draft.companyId === companyId)
  }
}

class InMemoryPurchaseBillRepository implements PurchaseBillRepository {
  private bills: Array<PurchaseBillRecord> = []

  async findBySupplierBillNumber(input: {
    companyId: string
    supplierId: string
    supplierBillNumber: string
    financialYearStart: string
  }) {
    return (
      this.bills.find(
        (bill) =>
          bill.companyId === input.companyId &&
          bill.supplierId === input.supplierId &&
          bill.supplierBillNumber === input.supplierBillNumber &&
          bill.financialYearStart === input.financialYearStart,
      ) ?? null
    )
  }

  async create(bill: PurchaseBillRecord) {
    this.bills.push(bill)
    return bill
  }

  async findById(id: string) {
    return this.bills.find((bill) => bill.id === id) ?? null
  }

  async save(bill: PurchaseBillRecord) {
    return bill
  }

  async listByCompanyId(companyId: string) {
    return this.bills.filter((bill) => bill.companyId === companyId)
  }
}

import type { DocumentAttachmentRepository } from '#/features/documents/document-attachment-service.ts'
import type { DocumentAttachmentRecord } from '#/features/documents/document-attachment-service.ts'

class InMemoryAttachmentRepository implements DocumentAttachmentRepository {
  async create(attachment: DocumentAttachmentRecord) {
    return attachment
  }

  async findById(id: string) {
    return {
      id,
      companyId: 'company-1',
      linkedDocumentType: 'purchase_bill',
      linkedDocumentId: 'bill-1',
      storageKey: 'attachments/company-1/x',
      originalFilename: 'scan.pdf',
      contentType: 'application/pdf',
      sizeBytes: 100,
      createdAt: new Date(),
    }
  }
}

const sampleFields = {
  supplierName: { value: 'Textile Mills', confidence: 0.92 },
  supplierGstin: { value: '24AABCU9603R1ZM', confidence: 0.88 },
  billNumber: { value: 'SUP-1001', confidence: 0.95 },
  billDate: { value: '2026-07-11', confidence: 0.81 },
  taxableAmount: { value: '8000.00', confidence: 0.9 },
  gstAmount: { value: '400.00', confidence: 0.9 },
  totalAmount: { value: '8400.00', confidence: 0.91 },
} as const

describe('confirmOcrDraft', () => {
  test('posts a purchase bill and marks the draft posted', async () => {
    const repository = new InMemoryOcrDraftRepository()
    const parties = new InMemoryPartyRepository()
    const items = new InMemoryItemRepository()
    const bills = new InMemoryPurchaseBillRepository()
    const posting = new InMemoryLedgerPostingRepository()
    const stock = new InMemoryStockStore()
    const ledgers = new InMemoryLedgerAccountRepository()
    const companyId = 'company-1'

    const accounts = await setupDefaultChartOfAccounts(ledgers, {
      companyId,
      businessType: 'wholesale',
    })
    const purchaseAccountId = accounts.find(
      (account) => account.systemKey === 'purchase',
    )!.id
    const inputGstAccountId = accounts.find(
      (account) => account.systemKey === 'input_gst',
    )!.id
    const payableAccountId = accounts.find(
      (account) => account.systemKey === 'supplier_payable',
    )!.id
    const stockAccountId = accounts.find(
      (account) => account.systemKey === 'stock_in_hand',
    )!.id

    const attachments = new InMemoryAttachmentRepository()
    const draft = await createOcrDraft(repository, attachments, {
      companyId,
      attachmentId: 'att-1',
      fields: sampleFields,
    })

    const confirmed = await confirmOcrDraft(
      repository,
      { parties, items, bills, posting, stock, ledgers },
      {
        draftId: draft.id,
        companyId,
        reviewedByUserId: 'user-1',
        companyStateCode: '27',
        financialYearStart: '2026-04-01',
        purchaseAccountId,
        inputGstAccountId,
        payableAccountId,
        stockAccountId,
      },
    )

    expect(confirmed.status).toBe('posted')
    expect(confirmed.postedPurchaseBillId).toBeTruthy()

    const postedBill = await bills.findById(confirmed.postedPurchaseBillId!)
    expect(postedBill?.supplierBillNumber).toBe('SUP-1001')
    expect(postedBill?.taxableAmount).toBe('8000.00')
  })
})
