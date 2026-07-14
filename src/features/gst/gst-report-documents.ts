import Decimal from 'decimal.js'

import type { PartyRepository } from '#/features/parties/party-service.ts'
import type { PurchaseBillRepository } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRepository } from '#/features/sales/sales-invoice-service.ts'
import type { GstReportDocument } from '#/features/gst/gst-report-types.ts'

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export async function buildGstDocuments(input: {
  companyId: string
  companyStateCode: string
  invoices: SalesInvoiceRepository
  bills: PurchaseBillRepository
  parties: PartyRepository
}): Promise<Array<GstReportDocument>> {
  const [sales, purchases, partyList] = await Promise.all([
    input.invoices.listByCompanyId(input.companyId),
    input.bills.listByCompanyId(input.companyId),
    input.parties.listByCompanyId(input.companyId),
  ])
  const partyById = new Map(partyList.map((party) => [party.id, party]))

  const salesDocs: Array<GstReportDocument> = sales.map((invoice) => {
    const party = partyById.get(invoice.customerId)
    const partyState = party?.stateCode ?? input.companyStateCode
    const supplyType =
      partyState === input.companyStateCode ? 'intra_state' : 'inter_state'
    const half = new Decimal(invoice.totalGstAmount).div(2).toFixed(2)
    return {
      id: invoice.id,
      companyId: invoice.companyId,
      documentType: 'sales_invoice',
      documentDate: invoice.invoiceDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? 'Customer',
      placeOfSupply: partyState,
      supplyType,
      taxableAmount: invoice.taxableAmount,
      cgstAmount: supplyType === 'intra_state' ? half : '0.00',
      sgstAmount: supplyType === 'intra_state' ? half : '0.00',
      igstAmount:
        supplyType === 'inter_state' ? invoice.totalGstAmount : '0.00',
      totalGstAmount: invoice.totalGstAmount,
      totalAmount: invoice.totalAmount,
      invoiceNumber: invoice.invoiceNumber,
    }
  })

  const purchaseDocs: Array<GstReportDocument> = purchases.map((bill) => {
    const party = partyById.get(bill.supplierId)
    const partyState = party?.stateCode ?? input.companyStateCode
    const supplyType =
      partyState === input.companyStateCode ? 'intra_state' : 'inter_state'
    const half = new Decimal(bill.totalGstAmount).div(2).toFixed(2)
    return {
      id: bill.id,
      companyId: bill.companyId,
      documentType: 'purchase_bill',
      documentDate: bill.billDate,
      partyGstin: party?.gstin ?? null,
      partyName: party?.name ?? 'Supplier',
      placeOfSupply: partyState,
      supplyType,
      taxableAmount: bill.taxableAmount,
      cgstAmount: supplyType === 'intra_state' ? half : '0.00',
      sgstAmount: supplyType === 'intra_state' ? half : '0.00',
      igstAmount: supplyType === 'inter_state' ? bill.totalGstAmount : '0.00',
      totalGstAmount: bill.totalGstAmount,
      totalAmount: bill.totalAmount,
      invoiceNumber: bill.supplierBillNumber,
    }
  })

  return [...salesDocs, ...purchaseDocs]
}
