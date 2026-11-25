import Decimal from 'decimal.js'

export type OpenDocument = {
  id: string
  date: string
  outstanding: string
}

/** Document id → amount to adjust, as typed in the voucher grid. */
export type AllocationDraft = Record<string, string>

function parse(value: string | undefined) {
  const trimmed = (value ?? '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null
  return new Decimal(trimmed)
}

/** Spreads an amount over open bills, oldest first. */
export function allocateOldestFirst(
  amount: string,
  documents: Array<OpenDocument>,
): AllocationDraft {
  let remaining = parse(amount) ?? new Decimal(0)
  const plan: AllocationDraft = {}
  const ordered = [...documents].sort((a, b) =>
    a.date === b.date ? 0 : a.date < b.date ? -1 : 1,
  )
  for (const document of ordered) {
    if (remaining.lte(0)) break
    const outstanding = new Decimal(document.outstanding)
    if (outstanding.lte(0)) continue
    const share = Decimal.min(remaining, outstanding)
    plan[document.id] = share.toFixed(2)
    remaining = remaining.minus(share)
  }
  return plan
}

export function summariseAllocation(amount: string, draft: AllocationDraft) {
  const total = parse(amount) ?? new Decimal(0)
  const allocated = Object.values(draft).reduce(
    (sum, value) => sum.plus(parse(value) ?? 0),
    new Decimal(0),
  )
  return {
    allocated: allocated.toFixed(2),
    advance: Decimal.max(total.minus(allocated), 0).toFixed(2),
    overAllocated: allocated.gt(total),
  }
}

/** The non-empty, positive rows of a draft, ready to post. */
export function draftToAllocations(draft: AllocationDraft) {
  return Object.entries(draft)
    .map(([documentId, value]) => ({ documentId, amount: parse(value) }))
    .filter(
      (row): row is { documentId: string; amount: Decimal } =>
        row.amount !== null && row.amount.gt(0),
    )
    .map((row) => ({
      documentId: row.documentId,
      amount: row.amount.toFixed(2),
    }))
}
