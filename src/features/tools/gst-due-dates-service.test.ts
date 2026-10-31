import { describe, expect, test } from 'vitest'

import { upcomingDueDates } from '#/features/tools/gst-due-dates-service.ts'

describe('upcomingDueDates', () => {
  test('monthly filers get GSTR-1 on the 11th and GSTR-3B on the 20th', () => {
    const dates = upcomingDueDates({
      filerType: 'monthly',
      stateCode: '07',
      from: '2026-10-30',
      count: 4,
    })
    expect(dates.map((entry) => [entry.form, entry.period, entry.dueDate])).toEqual([
      ['GSTR-1', 'Oct 2026', '2026-11-11'],
      ['GSTR-3B', 'Oct 2026', '2026-11-20'],
      ['GSTR-1', 'Nov 2026', '2026-12-11'],
      ['GSTR-3B', 'Nov 2026', '2026-12-20'],
    ])
  })

  test('QRMP filers pay PMT-06 monthly and file quarterly by state category', () => {
    const maharashtra = upcomingDueDates({
      filerType: 'qrmp',
      stateCode: '27',
      from: '2026-12-01',
      count: 10,
    })
    expect(maharashtra).toContainEqual(
      expect.objectContaining({ form: 'GSTR-1', period: 'Oct–Dec 2026', dueDate: '2027-01-13' }),
    )
    expect(maharashtra).toContainEqual(
      expect.objectContaining({ form: 'GSTR-3B', period: 'Oct–Dec 2026', dueDate: '2027-01-22' }),
    )
    expect(maharashtra).toContainEqual(
      expect.objectContaining({ form: 'PMT-06', period: 'Nov 2026', dueDate: '2026-12-25' }),
    )

    const delhi = upcomingDueDates({
      filerType: 'qrmp',
      stateCode: '07',
      from: '2026-12-01',
      count: 10,
    })
    expect(delhi).toContainEqual(
      expect.objectContaining({ form: 'GSTR-3B', period: 'Oct–Dec 2026', dueDate: '2027-01-24' }),
    )
  })

  test('composition dealers get CMP-08 and GSTR-4', () => {
    const dates = upcomingDueDates({
      filerType: 'composition',
      stateCode: '09',
      from: '2027-01-01',
      count: 3,
    })
    expect(dates.map((entry) => [entry.form, entry.dueDate])).toEqual([
      ['CMP-08', '2027-01-18'],
      ['CMP-08', '2027-04-18'],
      ['GSTR-4', '2027-04-30'],
    ])
  })

  test('results are sorted and never before the start date', () => {
    const dates = upcomingDueDates({
      filerType: 'monthly',
      stateCode: '29',
      from: '2026-11-15',
      count: 6,
    })
    expect(dates[0]?.dueDate).toBe('2026-11-20')
    const sorted = [...dates].sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    expect(dates).toEqual(sorted)
  })
})
