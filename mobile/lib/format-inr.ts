export function formatInr(value: string | number) {
  const amount = typeof value === 'string' ? Number(value) : value
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Number.isFinite(amount) ? amount : 0)
}

export function formatShortDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
