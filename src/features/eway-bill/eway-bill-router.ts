import Decimal from 'decimal.js'
import { z } from 'zod'

import { recordDocumentEvent } from '#/features/audit/audit-service.ts'
import {
  EWAY_BILL_PORTAL_URL,
  buildChallanLines,
  buildEWayBillJson,
  consignmentValue,
  eWayBillThreshold,
  isEWayBillDue,
  recordEWayBill,
  removeEWayBill,
} from '#/features/eway-bill/eway-bill-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import { TRPCError } from '@trpc/server'

import type { TRPCRouterRecord } from '@trpc/server'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type { CompanyRepository } from '#/features/companies/company-service.ts'
import type {
  EWayBillCompany,
  EWayBillDocument,
  EWayBillParty,
  EWayBillRepository,
  EWayBillSource,
} from '#/features/eway-bill/eway-bill-service.ts'
import type {
  ItemRecord,
  ItemRepository,
} from '#/features/inventory/item-service.ts'
import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { SalesDocumentRepository } from '#/features/sales-documents/sales-document-service.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

export type EWayBillRouterDeps = {
  eWayBills: EWayBillRepository
  invoices: Required<Pick<SalesInvoiceRepository, 'findById' | 'listByIds'>>
  salesDocuments: Pick<SalesDocumentRepository, 'findById'>
  companies: Pick<CompanyRepository, 'listByIds'>
  parties: Pick<PartyRepository, 'findById'>
  items: Pick<ItemRepository, 'listByCompanyId'>
  audit: AuditLogRepository
}

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const sourceSchema = z.object({
  kind: z.enum(['invoice', 'challan']),
  id: z.string().uuid(),
})
const transportModeSchema = z.enum(['road', 'rail', 'air', 'ship'])

const transportSchema = z.object({
  mode: transportModeSchema,
  distanceKm: z.number().int().min(0).max(4000),
  vehicleNumber: z.string().max(20),
  vehicleType: z.enum(['regular', 'odc']),
  transporterId: z.string().max(15),
  transporterName: z.string().max(100),
  transportDocNumber: z.string().max(15),
  transportDocDate: z.union([dateSchema, z.literal('')]),
  subSupplyType: z
    .enum([
      'job_work',
      'for_own_use',
      'line_sales',
      'recipient_not_known',
      'exhibition',
      'others',
    ])
    .optional(),
  subSupplyDescription: z.string().max(20).optional(),
})

type LoadedSource = {
  company: EWayBillCompany
  party: EWayBillParty
  document: EWayBillDocument
  invoice: SalesInvoiceRecord | null
  cancelled: boolean
}

function invoiceLines(
  invoice: SalesInvoiceRecord,
  items: Map<string, ItemRecord>,
) {
  return invoice.lines.map((line) => {
    const item = items.get(line.itemId)
    return {
      productName: item?.name ?? line.description,
      description: line.description,
      hsnCode: item?.hsnCode ?? '',
      quantity: line.quantity,
      unit: line.unit,
      taxableAmount: line.taxableAmount,
      gstRate: line.gstRate,
      gstAmount: line.gstAmount,
    }
  })
}

/** Older invoices may have no place of supply saved; it is then the party's state. */
function invoicePlaceOfSupply(
  invoice: SalesInvoiceRecord,
  partyStateCode: string,
) {
  return invoice.placeOfSupply || partyStateCode
}

export function createEWayBillRouter(deps: EWayBillRouterDeps) {
  async function itemMap(companyId: string) {
    const items = await deps.items.listByCompanyId(companyId)
    return new Map(items.map((item) => [item.id, item]))
  }

  async function loadSource(
    companyId: string,
    source: EWayBillSource,
  ): Promise<LoadedSource> {
    const company = (await deps.companies.listByIds([companyId])).at(0)
    if (!company || company.id !== companyId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Company not found' })
    }
    const companyInfo: EWayBillCompany = {
      gstin: company.gstin,
      name: company.tradeName || company.legalName,
      addressLine1: company.addressLine1,
      addressLine2: company.addressLine2,
      city: company.city,
      pincode: company.pincode,
      stateCode: company.stateCode,
    }
    const items = await itemMap(companyId)

    if (source.kind === 'invoice') {
      const invoice = await deps.invoices.findById(source.id)
      if (!invoice || invoice.companyId !== companyId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found' })
      }
      const party = await deps.parties.findById(invoice.customerId)
      const partyStateCode =
        invoice.partyStateCodeSnapshot || party?.stateCode || ''
      return {
        company: companyInfo,
        invoice,
        cancelled: invoice.status === 'cancelled',
        party: {
          gstin: invoice.partyGstinSnapshot,
          name: invoice.partyNameSnapshot,
          addressLine1: party?.addressLine1 ?? '',
          addressLine2: party?.addressLine2 ?? '',
          city: party?.city ?? '',
          pincode: party?.pincode ?? '',
          stateCode: partyStateCode,
        },
        document: {
          kind: 'invoice',
          number: invoice.invoiceNumber,
          date: invoice.invoiceDate,
          placeOfSupply: invoicePlaceOfSupply(invoice, partyStateCode),
          totalAmount: invoice.totalAmount,
          lines: invoiceLines(invoice, items),
        },
      }
    }

    const challan = await deps.salesDocuments.findById(companyId, source.id)
    if (!challan || challan.documentType !== 'delivery_challan') {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Delivery challan not found',
      })
    }
    const party = await deps.parties.findById(challan.customerId)
    if (!party || party.companyId !== companyId) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Customer not found' })
    }
    const lines = buildChallanLines(
      challan.lines.map((line) => {
        const item = items.get(line.itemId)
        return {
          productName: item?.name ?? line.description,
          description: line.description,
          hsnCode: item?.hsnCode ?? '',
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
          gstRate: item?.gstRate ?? '0',
        }
      }),
      { fromStateCode: company.stateCode, toStateCode: party.stateCode },
    )
    const total = lines.reduce(
      (sum, line) => sum.plus(line.taxableAmount).plus(line.gstAmount),
      new Decimal(0),
    )
    return {
      company: companyInfo,
      invoice: null,
      cancelled: false,
      party: {
        gstin: party.gstin,
        name: party.name,
        addressLine1: party.addressLine1 ?? '',
        addressLine2: party.addressLine2 ?? '',
        city: party.city ?? '',
        pincode: party.pincode ?? '',
        stateCode: party.stateCode,
      },
      document: {
        kind: 'challan',
        number: challan.documentNumber,
        date: challan.documentDate,
        placeOfSupply: party.stateCode,
        totalAmount: total.toFixed(2),
        lines,
      },
    }
  }

  return {
    forDocument: capabilityProcedure('view')
      .input(z.object({ companyId: z.string().uuid(), source: sourceSchema }))
      .query(async ({ input }) => {
        const loaded = await loadSource(input.companyId, input.source)
        const record = await deps.eWayBills.findBySource(
          input.companyId,
          input.source,
        )
        const invoice = loaded.invoice
        return {
          portalUrl: EWAY_BILL_PORTAL_URL,
          record,
          documentNumber: loaded.document.number,
          documentDate: loaded.document.date,
          companyHasGstin: Boolean(loaded.company.gstin?.trim()),
          cancelled: loaded.cancelled,
          consignmentValue: consignmentValue(loaded.document.lines),
          threshold: eWayBillThreshold(
            loaded.company.stateCode,
            loaded.document.placeOfSupply,
          ),
          deliveryPincode: loaded.party.pincode,
          prefill: {
            vehicleNumber: invoice?.vehicleNo ?? '',
            transportDocNumber: invoice?.lrNumber ?? '',
          },
        }
      }),
    buildJson: capabilityProcedure('view')
      .input(
        z.object({
          companyId: z.string().uuid(),
          source: sourceSchema,
          deliveryPincode: z.string().max(6),
          transport: transportSchema,
        }),
      )
      .mutation(async ({ input }) => {
        const loaded = await loadSource(input.companyId, input.source)
        if (loaded.cancelled) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This invoice is cancelled.',
          })
        }
        const json = buildEWayBillJson({
          company: loaded.company,
          party: {
            ...loaded.party,
            pincode: input.deliveryPincode.trim() || loaded.party.pincode,
          },
          document: loaded.document,
          transport: input.transport,
        })
        return {
          fileName: `ewaybill-${loaded.document.number.replace(/[^A-Za-z0-9-]/g, '_')}.json`,
          json,
        }
      }),
    record: capabilityProcedure('post_sales')
      .input(
        z.object({
          companyId: z.string().uuid(),
          source: sourceSchema,
          ewbNumber: z.string().max(20),
          ewbDate: dateSchema,
          validUntil: dateSchema,
          vehicleNumber: z.string().max(20),
          transportMode: transportModeSchema,
          distanceKm: z.number().int().min(0).max(4000),
          transporterId: z.string().max(15),
          transporterName: z.string().max(100),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const loaded = await loadSource(input.companyId, input.source)
        if (loaded.cancelled) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'This invoice is cancelled.',
          })
        }
        const record = await recordEWayBill(deps.eWayBills, input)
        await recordDocumentEvent(deps.audit, {
          companyId: input.companyId,
          actorUserId: ctx.userId,
          action: 'e_way_bill.recorded',
          entityType: 'e_way_bill',
          entityId: record.id,
          documentNumber: `${loaded.document.number} · EWB ${record.ewbNumber}`,
          amount: loaded.document.totalAmount,
        })
        return record
      }),
    remove: capabilityProcedure('post_sales')
      .input(z.object({ companyId: z.string().uuid(), id: z.string().uuid() }))
      .mutation(async ({ ctx, input }) => {
        const existing = (
          await deps.eWayBills.listByCompanyId(input.companyId)
        ).find((record) => record.id === input.id)
        await removeEWayBill(deps.eWayBills, input)
        await recordDocumentEvent(deps.audit, {
          companyId: input.companyId,
          actorUserId: ctx.userId,
          action: 'e_way_bill.removed',
          entityType: 'e_way_bill',
          entityId: input.id,
          documentNumber: existing ? `EWB ${existing.ewbNumber}` : '',
          amount: '0.00',
        })
        return { ok: true }
      }),
    /**
     * E-way bill status of the invoices shown in the sales register:
     * `recorded` once a number is stored, `due` when one is needed.
     */
    invoiceStatuses: capabilityProcedure('view')
      .input(
        z.object({
          companyId: z.string().uuid(),
          invoiceIds: z.array(z.string().uuid()).max(500),
        }),
      )
      .query(async ({ input }) => {
        const company = (await deps.companies.listByIds([input.companyId])).at(
          0,
        )
        const statuses: Partial<Record<string, 'recorded' | 'due'>> = {}
        if (!company?.gstin?.trim() || input.invoiceIds.length === 0) {
          return statuses
        }
        const [invoices, records, items] = await Promise.all([
          deps.invoices.listByIds(input.companyId, input.invoiceIds),
          deps.eWayBills.listByCompanyId(input.companyId),
          itemMap(input.companyId),
        ])
        const recorded = new Set(records.map((record) => record.salesInvoiceId))
        for (const invoice of invoices) {
          if (recorded.has(invoice.id)) {
            statuses[invoice.id] = 'recorded'
          } else if (
            isEWayBillDue({
              companyGstin: company.gstin,
              fromStateCode: company.stateCode,
              toStateCode: invoicePlaceOfSupply(
                invoice,
                invoice.partyStateCodeSnapshot,
              ),
              cancelled: invoice.status === 'cancelled',
              hasEWayBill: false,
              lines: invoiceLines(invoice, items),
            })
          ) {
            statuses[invoice.id] = 'due'
          }
        }
        return statuses
      }),
  } satisfies TRPCRouterRecord
}
