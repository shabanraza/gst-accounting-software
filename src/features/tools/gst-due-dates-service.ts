export type FilerType = 'monthly' | 'qrmp' | 'composition'

export type DueDateEntry = {
  form: string
  period: string
  dueDate: string
  note: string
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/**
 * QRMP filers in these states file quarterly GSTR-3B by the 22nd; everyone
 * else by the 24th (Notification 76/2020-CT and later amendments).
 */
const QRMP_22ND_STATE_CODES = new Set([
  '22', '23', '24', '25', '26', '27', '29', '30', '31', '32', '33', '34', '35', '36', '37',
])

type YearMonth = { year: number; month: number }

function addMonths({ year, month }: YearMonth, count: number): YearMonth {
  const index = year * 12 + (month - 1) + count
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

function isoDate({ year, month }: YearMonth, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function monthLabel({ year, month }: YearMonth): string {
  return `${MONTHS[month - 1]} ${year}`
}

/** Indian financial year starting in April: Apr–Jun is Q1, Jan–Mar is Q4. */
function quarterEndMonth(month: number): number {
  return [3, 6, 9, 12].find((end) => month <= end) ?? 12
}

function quarterLabel(end: YearMonth): string {
  const start = addMonths(end, -2)
  return `${MONTHS[start.month - 1]}–${MONTHS[end.month - 1]} ${end.year}`
}

function financialYearLabel(startYear: number): string {
  return `FY ${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`
}

export function upcomingDueDates(input: {
  filerType: FilerType
  stateCode: string
  from: string
  count: number
}): Array<DueDateEntry> {
  const [fromYear = 0, fromMonth = 1] = input.from.split('-').map(Number)
  const start: YearMonth = { year: fromYear, month: fromMonth }
  const entries: Array<DueDateEntry> = []

  // GSTR-9 falls due nine months after the March it belongs to, so look back far enough.
  for (let offset = -10; offset <= 15; offset += 1) {
    const period = addMonths(start, offset)
    const next = addMonths(period, 1)
    const isQuarterEnd = quarterEndMonth(period.month) === period.month

    if (input.filerType === 'monthly') {
      entries.push({
        form: 'GSTR-1',
        period: monthLabel(period),
        dueDate: isoDate(next, 11),
        note: 'Outward supplies',
      })
      entries.push({
        form: 'GSTR-3B',
        period: monthLabel(period),
        dueDate: isoDate(next, 20),
        note: 'Summary return and tax payment',
      })
    }

    if (input.filerType === 'qrmp') {
      if (isQuarterEnd) {
        entries.push({
          form: 'GSTR-1',
          period: quarterLabel(period),
          dueDate: isoDate(next, 13),
          note: 'Quarterly outward supplies',
        })
        entries.push({
          form: 'GSTR-3B',
          period: quarterLabel(period),
          dueDate: isoDate(next, QRMP_22ND_STATE_CODES.has(input.stateCode) ? 22 : 24),
          note: 'Quarterly summary return',
        })
      } else {
        entries.push({
          form: 'IFF',
          period: monthLabel(period),
          dueDate: isoDate(next, 13),
          note: 'Optional — B2B invoices for the month',
        })
        entries.push({
          form: 'PMT-06',
          period: monthLabel(period),
          dueDate: isoDate(next, 25),
          note: 'Monthly tax payment',
        })
      }
    }

    if (input.filerType === 'composition' && isQuarterEnd) {
      entries.push({
        form: 'CMP-08',
        period: quarterLabel(period),
        dueDate: isoDate(next, 18),
        note: 'Quarterly tax statement',
      })
    }

    // Annual returns: tied to the month the financial year closes (March).
    if (period.month === 3) {
      const fyStart = period.year - 1
      if (input.filerType === 'composition') {
        entries.push({
          form: 'GSTR-4',
          period: financialYearLabel(fyStart),
          dueDate: isoDate({ year: period.year, month: 4 }, 30),
          note: 'Annual return for composition dealers',
        })
      } else {
        entries.push({
          form: 'GSTR-9',
          period: financialYearLabel(fyStart),
          dueDate: isoDate({ year: period.year, month: 12 }, 31),
          note: 'Annual return (optional up to ₹2 crore turnover)',
        })
      }
    }
  }

  return entries
    .filter((entry) => entry.dueDate >= input.from)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.form.localeCompare(b.form))
    .slice(0, input.count)
}
