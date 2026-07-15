import { describe, expect, it } from 'vitest'

import {
  purchaseBillSummaryRows,
  purchaseBillTotalsRows,
} from './purchase-bill-detail.ts'

const bill = {
  supplierBillNumber: 'BILL-001',
  billDate: '2026-03-01',
  paymentStatus: 'Pending',
  partyNameSnapshot: 'Acme Supplies',
  placeOfSupply: '27',
  taxableAmount: '1000.00',
  totalGstAmount: '180.00',
  totalAmount: '1180.00',
  outstandingAmount: '1180.00',
  lines: [],
}

describe('purchase-bill-detail', () => {
  it('builds summary rows', () => {
    expect(purchaseBillSummaryRows(bill)[0]).toEqual({
      label: 'Supplier',
      value: 'Acme Supplies',
    })
  })

  it('builds totals rows', () => {
    expect(purchaseBillTotalsRows(bill)).toHaveLength(4)
  })
})
