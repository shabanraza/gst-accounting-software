import { describe, expect, test } from 'vitest'

import {
  buildMonthCompareView,
  collapseRangeLabel,
  hasTrendActivity,
  isFirstRun,
  isQuietDay,
} from '#/features/dashboard/dashboard-view.ts'

import type { OwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'

const monthCompare = {
  currentLabel: '1 Jul – 15 Jul',
  previousLabel: '1 Jun – 15 Jun',
  current: {
    salesTotal: '125000.00',
    purchaseTotal: '80000.00',
    expensesTotal: '12000.00',
  },
  previous: {
    salesTotal: '100000.00',
    purchaseTotal: '80000.00',
    expensesTotal: '15000.00',
  },
  change: {
    salesPercent: '25.0',
    purchasePercent: '0.0',
    expensesPercent: '-20.0',
  },
}

describe('collapseRangeLabel', () => {
  test('collapses a same-day range to a single date', () => {
    expect(collapseRangeLabel('1 Jul – 1 Jul')).toBe('1 Jul')
  })

  test('leaves a real range untouched', () => {
    expect(collapseRangeLabel('1 Jun – 15 Jun')).toBe('1 Jun – 15 Jun')
  })
})

describe('buildMonthCompareView', () => {
  test('carries every month-to-date figure in reading order', () => {
    expect(
      buildMonthCompareView(monthCompare).figures.map((f) => f.key),
    ).toEqual(['sales', 'purchases', 'expenses'])
  })

  test('labels a rise and a fall with a signed percentage', () => {
    const figures = buildMonthCompareView(monthCompare).figures

    expect(figures[0].change).toEqual({ direction: 'up', label: '+25.0%' })
    expect(figures[2].change).toEqual({ direction: 'down', label: '-20.0%' })
  })

  test('omits the change entirely when nothing moved', () => {
    expect(
      buildMonthCompareView(monthCompare).figures[1].change,
    ).toBeUndefined()
  })

  test('captions the comparison window when something moved', () => {
    expect(buildMonthCompareView(monthCompare).caption).toBe(
      'vs 1 Jun – 15 Jun',
    )
  })

  test('collapses a same-day comparison window in the caption', () => {
    const view = buildMonthCompareView({
      ...monthCompare,
      previousLabel: '1 Jun – 1 Jun',
    })

    expect(view.caption).toBe('vs 1 Jun')
  })

  test('drops the caption when no figure moved', () => {
    const view = buildMonthCompareView({
      ...monthCompare,
      change: {
        salesPercent: '0.0',
        purchasePercent: '0.0',
        expensesPercent: '0.0',
      },
    })

    expect(view.caption).toBeUndefined()
    expect(view.figures.every((figure) => figure.change === undefined)).toBe(
      true,
    )
  })
})

describe('hasTrendActivity', () => {
  test('is false for a window of empty days', () => {
    expect(
      hasTrendActivity([
        { date: '2026-07-14', sales: '0.00', purchases: '0.00' },
        { date: '2026-07-15', sales: '0.00', purchases: '0.00' },
      ]),
    ).toBe(false)
  })

  test('is true as soon as one day carries a purchase', () => {
    expect(
      hasTrendActivity([
        { date: '2026-07-14', sales: '0.00', purchases: '0.00' },
        { date: '2026-07-15', sales: '0.00', purchases: '4200.00' },
      ]),
    ).toBe(true)
  })
})

describe('isQuietDay', () => {
  const quiet = {
    today: {
      salesTotal: '0.00',
      purchaseTotal: '0.00',
      moneyIn: '0.00',
      moneyOut: '0.00',
      expensesTotal: '0.00',
      netCashFlow: '0.00',
    },
    dueToday: { receivables: [], payables: [] },
    todayExpenses: [],
  }

  test('is true when nothing was recorded and nothing falls due', () => {
    expect(isQuietDay(quiet)).toBe(true)
  })

  test('is false when cash moved without an invoice', () => {
    expect(
      isQuietDay({
        ...quiet,
        today: { ...quiet.today, moneyIn: '5000.00', netCashFlow: '5000.00' },
      }),
    ).toBe(false)
  })

  test('is false when a bill falls due, even with no entries', () => {
    expect(
      isQuietDay({
        ...quiet,
        dueToday: {
          receivables: [],
          payables: [
            {
              id: 'bill-1',
              partyName: 'Sharma Traders',
              documentNumber: 'B-1',
              amount: '4200.00',
              kind: 'payable' as const,
            },
          ],
        },
      }),
    ).toBe(false)
  })
})

describe('isFirstRun', () => {
  const empty: OwnerDashboardSnapshot = {
    asOfDate: '2026-07-15',
    today: {
      salesTotal: '0.00',
      purchaseTotal: '0.00',
      moneyIn: '0.00',
      moneyOut: '0.00',
      expensesTotal: '0.00',
      netCashFlow: '0.00',
    },
    balances: {
      cashBankBalance: '0.00',
      receivableTotal: '0.00',
      receivableOverdue: '0.00',
      payableTotal: '0.00',
      payableDueThisWeek: '0.00',
    },
    topReceivables: [],
    topPayables: [],
    setup: { hasParty: false, hasItem: false, hasSale: false },
    trend: [
      { date: '2026-07-14', sales: '0.00', purchases: '0.00' },
      { date: '2026-07-15', sales: '0.00', purchases: '0.00' },
    ],
    todayExpenses: [],
    dueToday: { receivables: [], payables: [] },
    overdue: { invoiceCount: 0, billCount: 0 },
    monthCompare: {
      currentLabel: '1 Jul – 15 Jul',
      previousLabel: '1 Jun – 15 Jun',
      current: {
        salesTotal: '0.00',
        purchaseTotal: '0.00',
        expensesTotal: '0.00',
      },
      previous: {
        salesTotal: '0.00',
        purchaseTotal: '0.00',
        expensesTotal: '0.00',
      },
      change: {
        salesPercent: '0.0',
        purchasePercent: '0.0',
        expensesPercent: '0.0',
      },
    },
    attention: [],
  }

  test('is true for a company with nothing on its books', () => {
    expect(isFirstRun(empty)).toBe(true)
  })

  test('is false when an older invoice is still outstanding', () => {
    expect(
      isFirstRun({
        ...empty,
        balances: { ...empty.balances, receivableTotal: '4200.00' },
      }),
    ).toBe(false)
  })

  test('is false when the books hold cash but the window is empty', () => {
    expect(
      isFirstRun({
        ...empty,
        balances: { ...empty.balances, cashBankBalance: '125000.00' },
      }),
    ).toBe(false)
  })

  test('is false when the previous month traded', () => {
    expect(
      isFirstRun({
        ...empty,
        monthCompare: {
          ...empty.monthCompare,
          previous: { ...empty.monthCompare.previous, salesTotal: '80000.00' },
        },
      }),
    ).toBe(false)
  })

  test('is false while anything still needs attention', () => {
    expect(
      isFirstRun({
        ...empty,
        attention: [
          {
            id: 'low-stock-1',
            kind: 'low-stock',
            tone: 'inventory',
            title: 'Copper wire is low',
            detail: '2 left, reorder at 10',
            score: 40,
            actionable: true,
            to: '/app/inventory',
          },
        ],
      }),
    ).toBe(false)
  })
})
