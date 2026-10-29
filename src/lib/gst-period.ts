export function gstMonthStart(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

export function gstMonthEnd(year: number, month: number) {
  const lastDay = new Date(year, month, 0).getDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

export function currentGstMonthPeriod(from = new Date()) {
  const year = from.getFullYear()
  const month = from.getMonth() + 1
  return {
    periodStart: gstMonthStart(year, month),
    periodEnd: gstMonthEnd(year, month),
    label: from.toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    }),
  }
}

/** Indian financial year (April–March) containing the given date. */
export function currentFinancialYearStart(from = new Date()) {
  const year =
    from.getMonth() >= 3 ? from.getFullYear() : from.getFullYear() - 1
  return `${year}-04-01`
}

/**
 * Statutory due dates for a monthly filer's return covering the month of
 * `asOf` (`YYYY-MM-DD`): GSTR-1 on the 11th and GSTR-3B on the 20th of the
 * following month. Quarterly (QRMP) filers have different dates.
 */
export function monthlyGstFilingDates(asOf: string) {
  const [year, month] = asOf.split('-').map(Number)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = String(month === 12 ? 1 : month + 1).padStart(2, '0')
  return {
    gstr1: `${nextYear}-${nextMonth}-11`,
    gstr3b: `${nextYear}-${nextMonth}-20`,
  }
}
