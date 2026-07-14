import { buildVoucherPrintDocument } from '#/features/documents/voucher-print-builder.ts'
import {
  hasPartySnapshot,
  toPrintPartyFromSnapshot,
} from '#/features/documents/voucher-print-mappers.ts'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'

export function buildInvoicePrintDocument(input: {
  invoice: SalesInvoiceRecord
  company: VoucherPrintDocument['company']
  customer?: VoucherPrintDocument['party']
  itemById: Map<string, ItemRecord>
}): VoucherPrintDocument {
  const { invoice } = input
  const customer = hasPartySnapshot(invoice)
    ? toPrintPartyFromSnapshot(invoice)
    : input.customer

  if (!customer) {
    throw new Error('Customer details are required to print this invoice')
  }

  return buildVoucherPrintDocument({
    kind: 'sales',
    title: 'Tax Invoice',
    documentNumber: invoice.invoiceNumber,
    documentDate: invoice.invoiceDate,
    dueDate: invoice.dueDate,
    poReference: invoice.poReference,
    transportMode: invoice.transportMode,
    vehicleNo: invoice.vehicleNo,
    lrNumber: invoice.lrNumber,
    challanRef: invoice.challanRef,
    paymentMode: invoice.paymentMode,
    narration: invoice.narration,
    company: input.company,
    party: customer,
    partyLabel: 'Billed to',
    placeOfSupplyCode: invoice.placeOfSupply || customer.stateCode,
    reverseCharge: invoice.reverseCharge,
    rawLines: invoice.lines.map((line) => ({
      description: line.description,
      hsnCode: input.itemById.get(line.itemId)?.hsnCode ?? '',
      quantity: line.quantity,
      unit: line.unit,
      rate: line.rate,
      discountAmount: line.discountAmount,
      taxableAmount: line.taxableAmount,
      gstRate: line.gstRate,
      gstAmount: line.gstAmount,
      lineTotal: line.lineTotal,
    })),
    freight: invoice.freight,
    packing: invoice.packing,
    roundOff: invoice.roundOff,
    billDiscount: invoice.billDiscount,
    taxableAmount: invoice.taxableAmount,
    totalGstAmount: invoice.totalGstAmount,
    totalAmount: invoice.totalAmount,
    outstandingAmount: invoice.outstandingAmount,
  })
}
