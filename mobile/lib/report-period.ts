export function currentMonthPeriod(asOf = new Date()) {
  const year = asOf.getFullYear()
  const month = String(asOf.getMonth() + 1).padStart(2, '0')
  const lastDay = new Date(year, asOf.getMonth() + 1, 0).getDate()

  return {
    periodStart: `${year}-${month}-01`,
    periodEnd: `${year}-${month}-${String(lastDay).padStart(2, '0')}`,
  }
}
