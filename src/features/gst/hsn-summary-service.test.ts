import { describe, expect, test } from 'vitest'

import { buildHsnSummary } from '#/features/gst/hsn-summary-service.ts'
import { InMemoryItemRepository } from '#/features/inventory/inventory-store.ts'
import type {
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'

class InMemorySalesInvoiceRepository implements SalesInvoiceRepository {
  constructor(private invoices: Array<SalesInvoiceRecord> = []) {}

  async create(invoice: SalesInvoiceRecord) {
    this.invoices.push(invoice)
    return invoice
  }

  async findById(id: string) {
    return this.invoices.find((invoice) => invoice.id === id) ?? null
  }

  async save(invoice: SalesInvoiceRecord) {
    return invoice
  }

  async listByCompanyId(companyId: string) {
    return this.invoices.filter((invoice) => invoice.companyId === companyId)
  }
}

describe('buildHsnSummary', () => {
  test('aggregates sales invoice lines by HSN', async () => {
    const companyId = 'company-1'
    const items = new InMemoryItemRepository()
    const item = await items.create({
      id: 'item-1',
      companyId,
      name: 'Cotton',
      alias: '',
      itemGroup: '',
      hsnCode: '5208',
      gstRate: '12.00',
      baseUnit: 'Meter',
      alternateUnit: '',
      conversionFactor: '1',
      mrp: '0.00',
      reorderLevel: '0',
      purchaseRate: '80.00',
      saleRate: '100.00',
      tracksInventory: true,
      createdAt: new Date(),
    })

    const invoices = new InMemorySalesInvoiceRepository([
      {
        id: 'inv-1',
        companyId,
        customerId: 'cust-1',
        invoiceNumber: 'S-1',
        invoiceDate: '2026-04-20',
        paymentMode: 'credit',
        paymentStatus: 'Pending',
        taxMode: 'exclusive',
        narration: '',
        freight: '0.00',
        packing: '0.00',
        roundOff: '0.00',
        billDiscount: '0.00',
        godownName: null,
        status: 'posted',
        taxableAmount: '1000.00',
        totalGstAmount: '120.00',
        totalAmount: '1120.00',
        outstandingAmount: '1120.00',
        ledgerEntryId: 'le-1',
        createdAt: new Date(),
        lines: [
          {
            id: 'line-1',
            itemId: item.id,
            description: 'Cotton',
            quantity: '10',
            unit: 'Meter',
            rate: '100.00',
            gstRate: '12.00',
            discountPercent: '0.00',
            discountAmount: '0.00',
            taxableAmount: '1000.00',
            gstAmount: '120.00',
            lineTotal: '1120.00',
            godownName: null,
          },
        ],
      },
    ])

    const report = await buildHsnSummary(
      { invoices, items },
      companyId,
      { startDate: '2026-04-01', endDate: '2026-04-30' },
    )

    expect(report.rows).toHaveLength(1)
    expect(report.rows[0]).toMatchObject({
      hsnCode: '5208',
      taxableAmount: '1000.00',
      gstAmount: '120.00',
      quantity: '10.000',
    })
  })
})
