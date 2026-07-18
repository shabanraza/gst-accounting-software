export function filledDocumentLines<T extends { itemId: string }>(
  lines: Array<T>,
): Array<T> {
  return lines.filter((line) => line.itemId.trim())
}

export function computeLinesSubtotal(
  lines: Array<{ quantity: string; rate: string }>,
): string {
  const total = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity)
    const rate = Number(line.rate)
    if (!Number.isFinite(quantity) || !Number.isFinite(rate)) {
      return sum
    }
    return sum + quantity * rate
  }, 0)

  return total.toFixed(2)
}

export function computeLineAmount(quantity: string, rate: string): string | null {
  const qty = Number(quantity)
  const lineRate = Number(rate)
  if (!Number.isFinite(qty) || !Number.isFinite(lineRate)) {
    return null
  }

  return (qty * lineRate).toFixed(2)
}

export function validateDocumentLine(
  line: { itemId: string; quantity: string; rate: string },
  lineNumber: number,
) {
  if (!line.itemId.trim()) {
    return `Select an item on line ${lineNumber}.`
  }

  const quantity = Number(line.quantity)
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return `Enter a positive quantity on line ${lineNumber}.`
  }

  const rate = Number(line.rate)
  if (!Number.isFinite(rate) || rate < 0) {
    return `Enter a valid rate on line ${lineNumber}.`
  }

  return null
}
