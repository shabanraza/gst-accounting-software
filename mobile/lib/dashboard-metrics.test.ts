import { describe, expect, it } from 'vitest'

import {
  formatDashboardDate,
  getOverdueCounts,
  getOverdueTotals,
  mapOwnerSnapshotCards,
  mapOwnerSnapshotMetrics,
} from './dashboard-metrics.ts'

const snapshot = {
  asOfDate: '2026-07-15',
  today: {
    salesTotal: '1000.00',
    purchaseTotal: '500.00',
    moneyIn: '800.00',
    moneyOut: '200.00',
    expensesTotal: '100.00',
    netCashFlow: '600.00',
  },
  balances: {
    receivableTotal: '2000.00',
    payableTotal: '3000.00',
    cashBankBalance: '4000.00',
  },
  ageing: {
    receivables: {
      '0-30': '1000.00',
      '31-60': '500.00',
      '61-90': '300.00',
      '90+': '200.00',
    },
    payables: {
      '0-30': '1500.00',
      '31-60': '1000.00',
      '61-90': '300.00',
      '90+': '200.00',
    },
  },
}

describe('mapOwnerSnapshotCards', () => {
  it('maps owner dashboard snapshot fields to mobile cards', () => {
    expect(mapOwnerSnapshotCards(snapshot)).toEqual([
      { title: "Today's sales", amount: '1000.00', badge: 'Sales' },
      { title: 'Receivables', amount: '2000.00', badge: 'Due in' },
      { title: 'Payables', amount: '3000.00', badge: 'Outstanding' },
      { title: 'Cash & bank', amount: '4000.00', badge: 'Balance' },
    ])
  })
})

describe('mapOwnerSnapshotMetrics', () => {
  it('maps snapshot fields to horizontal dashboard metrics', () => {
    expect(mapOwnerSnapshotMetrics(snapshot)).toEqual([
      {
        id: 'sales',
        label: 'Sales',
        amount: '1000.00',
        icon: 'trending-up-outline',
      },
      {
        id: 'receipts',
        label: 'Receipts',
        amount: '800.00',
        icon: 'cash-outline',
      },
      {
        id: 'receivables',
        label: 'Receivables',
        amount: '2000.00',
        icon: 'arrow-down-outline',
      },
      {
        id: 'payables',
        label: 'Payables',
        amount: '3000.00',
        icon: 'arrow-up-outline',
      },
      {
        id: 'cash',
        label: 'Cash & bank',
        amount: '4000.00',
        icon: 'wallet-outline',
      },
    ])
  })
})

describe('getOverdueTotals', () => {
  it('sums overdue ageing buckets excluding current', () => {
    expect(getOverdueTotals(snapshot)).toEqual({
      receivables: 1000,
      payables: 1500,
    })
  })
})

describe('getOverdueCounts', () => {
  it('returns overdue document counts when present on snapshot', () => {
    expect(
      getOverdueCounts({
        ...snapshot,
        overdue: { invoiceCount: 7, billCount: 12 },
      }),
    ).toEqual({
      invoices: 7,
      bills: 12,
    })
  })

  it('returns zero counts when overdue data is missing', () => {
    expect(getOverdueCounts(snapshot)).toEqual({
      invoices: 0,
      bills: 0,
    })
  })
})

describe('formatDashboardDate', () => {
  it('formats snapshot date for the home header pill', () => {
    expect(formatDashboardDate('2026-07-15')).toMatch(/15/)
    expect(formatDashboardDate('2026-07-15')).toMatch(/Jul/)
  })
})
