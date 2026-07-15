import { describe, expect, it } from 'vitest'

import { mapOwnerSnapshotCards } from './dashboard-metrics.ts'

describe('mapOwnerSnapshotCards', () => {
  it('maps owner dashboard snapshot fields to mobile cards', () => {
    expect(
      mapOwnerSnapshotCards({
        today: { salesTotal: '1000.00' },
        balances: {
          receivableTotal: '2000.00',
          payableTotal: '3000.00',
          cashBankBalance: '4000.00',
        },
      }),
    ).toEqual([
      { title: "Today's sales", amount: '1000.00', badge: 'Sales' },
      { title: 'Receivables', amount: '2000.00', badge: 'Due in' },
      { title: 'Payables', amount: '3000.00', badge: 'Outstanding' },
      { title: 'Cash & bank', amount: '4000.00', badge: 'Balance' },
    ])
  })
})
