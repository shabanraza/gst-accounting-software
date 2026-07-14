import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'
import {
  applyInMemoryListFilters,
  resolveListLimit,
  type ListQueryOptions,
} from '#/lib/list-query.ts'

import type { AppDatabase } from '#/db/client.ts'
import type { TaxMode } from '#/features/accounting/voucher-math.ts'
import type {
  PaymentMode,
  PaymentStatus,
  SalesInvoiceRecord,
  SalesInvoiceRepository,
  SalesInvoiceStatus,
} from '#/features/sales/sales-invoice-service.ts'

export class InMemorySalesInvoiceRepository implements SalesInvoiceRepository {
  private readonly invoices: Array<SalesInvoiceRecord> = []

  async create(invoice: SalesInvoiceRecord) {
    this.invoices.push(invoice)
    return invoice
  }

  async findById(id: string) {
    return this.invoices.find((invoice) => invoice.id === id) ?? null
  }

  async save(invoice: SalesInvoiceRecord) {
    const index = this.invoices.findIndex((item) => item.id === invoice.id)
    if (index >= 0) {
      this.invoices[index] = invoice
    }
    return invoice
  }

  async listByCompanyId(companyId: string, options?: ListQueryOptions) {
    return applyInMemoryListFilters(
      this.invoices.filter((invoice) => invoice.companyId === companyId),
      options,
      (invoice) => invoice.invoiceDate,
      (invoice) => invoice.customerId,
    ).map((invoice) =>
      options?.includeLines === false ? { ...invoice, lines: [] } : invoice,
    )
  }

  async sumOutstandingByCustomer(companyId: string, customerId: string) {
    const total = this.invoices
      .filter(
        (invoice) =>
          invoice.companyId === companyId &&
          invoice.customerId === customerId &&
          invoice.status !== 'cancelled' &&
          invoice.paymentMode === 'credit',
      )
      .reduce((sum, invoice) => sum + Number(invoice.outstandingAmount), 0)
    return total.toFixed(2)
  }
}

type SalesInvoiceRow = typeof schema.salesInvoices.$inferSelect
type SalesInvoiceLineRow = typeof schema.salesInvoiceLines.$inferSelect

function mapRowsToSalesInvoiceRecord(
  invoice: SalesInvoiceRow,
  lines: Array<SalesInvoiceLineRow>,
): SalesInvoiceRecord {
  return {
    id: invoice.id,
    companyId: invoice.companyId,
    customerId: invoice.customerId,
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate,
    placeOfSupply: invoice.placeOfSupply || '',
    reverseCharge: invoice.reverseCharge,
    paymentMode: invoice.paymentMode as PaymentMode,
    paymentStatus: invoice.paymentStatus as PaymentStatus,
    taxMode: invoice.taxMode as TaxMode,
    narration: invoice.narration || '',
    freight: invoice.freight || '0.00',
    packing: invoice.packing || '0.00',
    roundOff: invoice.roundOff || '0.00',
    billDiscount: invoice.billDiscount || '0.00',
    godownName: invoice.godownName ?? null,
    dueDate: invoice.dueDate || invoice.invoiceDate,
    poReference: invoice.poReference || '',
    transportMode: invoice.transportMode || '',
    vehicleNo: invoice.vehicleNo || '',
    lrNumber: invoice.lrNumber || '',
    challanRef: invoice.challanRef || '',
    status: invoice.status as SalesInvoiceStatus,
    partyNameSnapshot: invoice.partyNameSnapshot || '',
    partyGstinSnapshot: invoice.partyGstinSnapshot ?? null,
    partyPanSnapshot: invoice.partyPanSnapshot || '',
    partyBillingAddressSnapshot: invoice.partyBillingAddressSnapshot || '',
    partyShippingAddressSnapshot: invoice.partyShippingAddressSnapshot || '',
    partyStateCodeSnapshot: invoice.partyStateCodeSnapshot || '',
    partyPhoneSnapshot: invoice.partyPhoneSnapshot || '',
    partyEmailSnapshot: invoice.partyEmailSnapshot || '',
    taxableAmount: invoice.taxableAmount,
    totalGstAmount: invoice.totalGstAmount,
    totalAmount: invoice.totalAmount,
    outstandingAmount: invoice.outstandingAmount,
    ledgerEntryId: invoice.ledgerEntryId,
    createdAt: invoice.createdAt,
    lines: lines.map((line) => ({
      id: line.id,
      itemId: line.itemId,
      description: line.description,
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      gstRate: line.gstRate,
      discountPercent: line.discountPercent || '0.00',
      discountAmount: line.discountAmount || '0.00',
      taxableAmount: line.taxableAmount,
      gstAmount: line.gstAmount,
      lineTotal: line.lineTotal,
      godownName: line.godownName ?? null,
    })),
  }
}

export class DrizzleSalesInvoiceRepository implements SalesInvoiceRepository {
  constructor(private readonly database: AppDatabase) {}

  async create(invoice: SalesInvoiceRecord) {
    const [createdInvoice] = await this.database
      .insert(schema.salesInvoices)
      .values({
        id: invoice.id,
        companyId: invoice.companyId,
        customerId: invoice.customerId,
        invoiceNumber: invoice.invoiceNumber,
        invoiceDate: invoice.invoiceDate,
        placeOfSupply: invoice.placeOfSupply,
        reverseCharge: invoice.reverseCharge,
        paymentMode: invoice.paymentMode,
        paymentStatus: invoice.paymentStatus,
        taxMode: invoice.taxMode,
        narration: invoice.narration,
        freight: invoice.freight,
        packing: invoice.packing,
        roundOff: invoice.roundOff,
        billDiscount: invoice.billDiscount,
        godownName: invoice.godownName,
        dueDate: invoice.dueDate,
        poReference: invoice.poReference,
        transportMode: invoice.transportMode,
        vehicleNo: invoice.vehicleNo,
        lrNumber: invoice.lrNumber,
        challanRef: invoice.challanRef,
        status: invoice.status,
        partyNameSnapshot: invoice.partyNameSnapshot,
        partyGstinSnapshot: invoice.partyGstinSnapshot,
        partyPanSnapshot: invoice.partyPanSnapshot,
        partyBillingAddressSnapshot: invoice.partyBillingAddressSnapshot,
        partyShippingAddressSnapshot: invoice.partyShippingAddressSnapshot,
        partyStateCodeSnapshot: invoice.partyStateCodeSnapshot,
        partyPhoneSnapshot: invoice.partyPhoneSnapshot,
        partyEmailSnapshot: invoice.partyEmailSnapshot,
        taxableAmount: invoice.taxableAmount,
        totalGstAmount: invoice.totalGstAmount,
        totalAmount: invoice.totalAmount,
        outstandingAmount: invoice.outstandingAmount,
        ledgerEntryId: invoice.ledgerEntryId,
        createdAt: invoice.createdAt,
      })
      .returning()

    const createdLines = await this.database
      .insert(schema.salesInvoiceLines)
      .values(
        invoice.lines.map((line) => ({
          id: line.id,
          salesInvoiceId: invoice.id,
          itemId: line.itemId,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          rate: line.rate,
          gstRate: line.gstRate,
          discountPercent: line.discountPercent,
          discountAmount: line.discountAmount,
          godownName: line.godownName,
          taxableAmount: line.taxableAmount,
          gstAmount: line.gstAmount,
          lineTotal: line.lineTotal,
        })),
      )
      .returning()

    return mapRowsToSalesInvoiceRecord(createdInvoice, createdLines)
  }

  async findById(id: string) {
    const invoices = await this.database
      .select()
      .from(schema.salesInvoices)
      .where(eq(schema.salesInvoices.id, id))
      .limit(1)

    if (invoices.length === 0) {
      return null
    }

    const lines = await this.database
      .select()
      .from(schema.salesInvoiceLines)
      .where(eq(schema.salesInvoiceLines.salesInvoiceId, invoices[0].id))

    return mapRowsToSalesInvoiceRecord(invoices[0], lines)
  }

  async save(invoice: SalesInvoiceRecord) {
    await this.database
      .update(schema.salesInvoices)
      .set({
        paymentStatus: invoice.paymentStatus,
        outstandingAmount: invoice.outstandingAmount,
        status: invoice.status,
      })
      .where(eq(schema.salesInvoices.id, invoice.id))

    return invoice
  }

  async listByCompanyId(companyId: string, options?: ListQueryOptions) {
    const conditions = [eq(schema.salesInvoices.companyId, companyId)]
    if (options?.partyId) {
      conditions.push(eq(schema.salesInvoices.customerId, options.partyId))
    }
    if (options?.startDate) {
      conditions.push(gte(schema.salesInvoices.invoiceDate, options.startDate))
    }
    if (options?.endDate) {
      conditions.push(lte(schema.salesInvoices.invoiceDate, options.endDate))
    }

    const limit = resolveListLimit(options?.limit)
    let query = this.database
      .select()
      .from(schema.salesInvoices)
      .where(and(...conditions))
      .orderBy(
        desc(schema.salesInvoices.invoiceDate),
        desc(schema.salesInvoices.id),
      )
      .$dynamic()

    // Over-fetch slightly when cursor is present so in-memory cursor filter still fills a page.
    if (limit != null) {
      query = query.limit(options?.cursor ? limit * 3 : limit)
    }

    let invoices = await query

    if (options?.cursor) {
      invoices = applyInMemoryListFilters(
        invoices,
        { cursor: options.cursor, limit },
        (row) => row.invoiceDate,
      )
    } else if (limit != null) {
      invoices = invoices.slice(0, limit)
    }

    if (invoices.length === 0) {
      return []
    }

    if (options?.includeLines === false) {
      return invoices.map((invoice) =>
        mapRowsToSalesInvoiceRecord(invoice, []),
      )
    }

    const invoiceIds = invoices.map((invoice) => invoice.id)
    const allLines = await this.database
      .select()
      .from(schema.salesInvoiceLines)
      .where(inArray(schema.salesInvoiceLines.salesInvoiceId, invoiceIds))

    const linesByInvoiceId = new Map<string, Array<SalesInvoiceLineRow>>()
    for (const line of allLines) {
      const group = linesByInvoiceId.get(line.salesInvoiceId) ?? []
      group.push(line)
      linesByInvoiceId.set(line.salesInvoiceId, group)
    }

    return invoices.map((invoice) =>
      mapRowsToSalesInvoiceRecord(
        invoice,
        linesByInvoiceId.get(invoice.id) ?? [],
      ),
    )
  }

  async sumOutstandingByCustomer(companyId: string, customerId: string) {
    const rows = await this.database
      .select({
        total: sql<string>`coalesce(sum(${schema.salesInvoices.outstandingAmount}::numeric), 0)`,
      })
      .from(schema.salesInvoices)
      .where(
        and(
          eq(schema.salesInvoices.companyId, companyId),
          eq(schema.salesInvoices.customerId, customerId),
          sql`${schema.salesInvoices.status} <> 'cancelled'`,
          eq(schema.salesInvoices.paymentMode, 'credit'),
        ),
      )

    const total = rows[0]?.total ?? '0'
    return Number(total).toFixed(2)
  }
}

export function createSalesInvoiceRepository(): SalesInvoiceRepository {
  const database = getDb()
  if (!database) {
    return new InMemorySalesInvoiceRepository()
  }

  return new DrizzleSalesInvoiceRepository(database)
}

export const salesInvoiceRepository = createSalesInvoiceRepository()
