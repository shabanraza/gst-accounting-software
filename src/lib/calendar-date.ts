export function localCalendarDate(from = new Date()) {
  return [
    from.getFullYear(),
    String(from.getMonth() + 1).padStart(2, '0'),
    String(from.getDate()).padStart(2, '0'),
  ].join('-')
}

export function parseCalendarDate(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatShortDate(value: string) {
  const date = parseCalendarDate(value)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })
}

export function formatMediumDate(value: string) {
  const date = parseCalendarDate(value)
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
