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
    label: from.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }),
  }
}
