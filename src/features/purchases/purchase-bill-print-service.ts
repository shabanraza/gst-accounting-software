import { buildVoucherPrintDocument } from '#/features/documents/voucher-print-builder.ts'

import type { ItemRecord } from '#/features/inventory/item-service.ts'
import type { VoucherPrintDocument } from '#/features/documents/voucher-print-types.ts'
import type { PurchaseBillRecord } from '#/features/purchases/purchase-bill-service.ts'

export function buildPurchaseBillPrintDocument(input: {
  bill: PurchaseBillRecord
  company: VoucherPrintDocument['company']
  supplier: VoucherPrintDocument['party']
  itemById: Map<string, ItemRecord>
}): VoucherPrintDocument {
  const { bill } = input

  return buildVoucherPrintDocument({
    kind: 'purchase',
    title: 'Purchase Bill',
    documentNumber: bill.supplierBillNumber,
    documentDate: bill.billDate,
    dueDate: bill.dueDate,
    poReference: bill.poReference,
    transportMode: bill.transportMode,
    vehicleNo: bill.vehicleNo,
    lrNumber: bill.lrNumber,
    challanRef: bill.challanRef,
    narration: bill.narration,
    company: input.company,
    party: input.supplier,
    partyLabel: 'Supplier',
    placeOfSupplyCode: bill.placeOfSupply || input.supplier.stateCode,
    reverseCharge: bill.reverseCharge,
    copyLabel: 'Office Copy',
    rawLines: bill.lines.map((line) => ({
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
    freight: bill.freight,
    packing: bill.packing,
    roundOff: bill.roundOff,
    billDiscount: bill.billDiscount,
    taxableAmount: bill.taxableAmount,
    totalGstAmount: bill.totalGstAmount,
    totalAmount: bill.totalAmount,
    outstandingAmount: bill.outstandingAmount,
  })
}
