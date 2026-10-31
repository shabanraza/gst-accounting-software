import type { VariantProps } from 'class-variance-authority'

import type { AgeingBucketLabel } from '#/features/accounting/ageing-service.ts'
import type { badgeVariants } from '#/components/ui/badge.tsx'
import type { LedgerAccountType } from '#/features/accounting/chart-of-accounts.ts'

/** Industry-standard status intents used across accounting UIs. */
export type BadgeIntent = NonNullable<
  VariantProps<typeof badgeVariants>['variant']
>

export function paymentStatusBadgeIntent(status: string): BadgeIntent {
  if (status === 'Paid') return 'success'
  // Pending / Part paid / unknown: amber is the industry "waiting" signal.
  return 'warning'
}

export function invoiceStatusBadgeIntent(input: {
  cancelled?: boolean
  paymentStatus: string
}): BadgeIntent {
  if (input.cancelled) return 'destructive'
  return paymentStatusBadgeIntent(input.paymentStatus)
}

export function workflowStatusBadgeIntent(status: string): BadgeIntent {
  if (status === 'open') return 'info'
  if (status === 'converted' || status === 'closed') return 'success'
  if (status === 'cancelled') return 'destructive'
  return 'neutral'
}

export function documentStatusBadgeIntent(status: string): BadgeIntent {
  if (status === 'open') return 'info'
  if (status === 'converted') return 'success'
  if (status === 'cancelled') return 'destructive'
  return 'neutral'
}

export function partyTypeBadgeIntent(partyType: string): BadgeIntent {
  if (partyType === 'customer') return 'info'
  if (partyType === 'supplier') return 'warning'
  return 'neutral'
}

export function stockStatusBadgeIntent(input: {
  isLowOrZero: boolean
}): BadgeIntent {
  return input.isLowOrZero ? 'warning' : 'success'
}

export function itemTrackingBadgeIntent(tracksInventory: boolean): BadgeIntent {
  return tracksInventory ? 'success' : 'neutral'
}

export function gstReconciliationBadgeIntent(status: string): BadgeIntent {
  if (status === 'matched') return 'success'
  if (status === 'mismatched' || status === 'conflict') return 'warning'
  if (
    status === 'missing' ||
    status === 'extra' ||
    status === 'missing_in_books' ||
    status === 'missing_in_2b' ||
    status === 'missing_in_gstr1'
  ) {
    return 'destructive'
  }
  return 'neutral'
}

/**
 * Receivables/payables ageing risk scale used across accounting UIs:
 * current → amber → deeper amber → money-out → overdue red. Never GST purple.
 */
export function ageingBucketBadgeIntent(
  bucket: AgeingBucketLabel,
): BadgeIntent {
  if (bucket === 'not-due') return 'success'
  if (bucket === '1-30') return 'warning'
  if (bucket === '31-60') return 'inventory'
  if (bucket === '61-90') return 'money-out'
  return 'destructive'
}

/** Chart fill for an ageing bucket — same risk scale as the badge intents. */
export function ageingBucketChartColor(bucket: AgeingBucketLabel): string {
  if (bucket === 'not-due') return 'var(--success)'
  if (bucket === '1-30') return 'var(--warning)'
  if (bucket === '31-60') return 'var(--inventory)'
  if (bucket === '61-90') return 'var(--money-out)'
  return 'var(--destructive)'
}

export function accountTypeBadgeIntent(
  accountType: LedgerAccountType,
): BadgeIntent {
  if (accountType === 'asset') return 'info'
  if (accountType === 'liability') return 'warning'
  if (accountType === 'income') return 'success'
  if (accountType === 'expense') return 'destructive'
  return 'neutral'
}

export function ocrDraftBadgeIntent(input: {
  lowConfidence: boolean
  status: string
}): BadgeIntent {
  if (input.lowConfidence) return 'warning'
  if (input.status === 'posted') return 'success'
  if (input.status === 'rejected') return 'destructive'
  return 'secondary'
}

/** Outcome of a free-tool check: it passes, needs action, fails, or is informational. */
export function toolCheckBadgeIntent(
  outcome: 'pass' | 'action' | 'fail' | 'info',
): BadgeIntent {
  if (outcome === 'pass') return 'success'
  if (outcome === 'action') return 'warning'
  if (outcome === 'fail') return 'destructive'
  return 'info'
}
