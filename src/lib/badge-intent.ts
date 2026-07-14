import type { VariantProps } from 'class-variance-authority'

import type { badgeVariants } from '#/components/ui/badge.tsx'
import type { LedgerAccountType } from '#/features/accounting/chart-of-accounts.ts'

/** Industry-standard status intents used across accounting UIs. */
export type BadgeIntent = NonNullable<
  VariantProps<typeof badgeVariants>['variant']
>

export function paymentStatusBadgeIntent(status: string): BadgeIntent {
  if (status === 'Paid') return 'success'
  if (status === 'Part paid') return 'warning'
  return 'info'
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
