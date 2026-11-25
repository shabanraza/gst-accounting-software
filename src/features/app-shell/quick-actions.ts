import type { Capability } from '#/features/companies/membership-service.ts'

export type QuickActionKey = 'sale' | 'purchase' | 'receipt' | 'payment'

export type QuickAction = {
  key: QuickActionKey
  label: string
  /** `KeyboardEvent.code`, so the shortcut works whatever Alt types on a Mac. */
  code: string
  shortcut: string
  capability: Capability
  to: string
  search?: { mode: 'receipts' | 'payments' }
}

export const QUICK_ACTIONS: Array<QuickAction> = [
  {
    key: 'sale',
    label: 'Sale',
    code: 'KeyS',
    shortcut: 'Alt+S',
    capability: 'post_sales',
    to: '/app/sales/new',
  },
  {
    key: 'purchase',
    label: 'Purchase',
    code: 'KeyP',
    shortcut: 'Alt+P',
    capability: 'post_purchase',
    to: '/app/purchases/new',
  },
  {
    key: 'receipt',
    label: 'Receipt',
    code: 'KeyR',
    shortcut: 'Alt+R',
    capability: 'post_payment',
    to: '/app/payments',
    search: { mode: 'receipts' },
  },
  {
    key: 'payment',
    label: 'Payment',
    code: 'KeyY',
    shortcut: 'Alt+Y',
    capability: 'post_payment',
    to: '/app/payments',
    search: { mode: 'payments' },
  },
]

type ShortcutKey = Pick<
  KeyboardEvent,
  'code' | 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
>

export function quickActionForKey(event: ShortcutKey): QuickAction | null {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return null
  }
  return QUICK_ACTIONS.find((action) => action.code === event.code) ?? null
}

export function visibleQuickActions(capabilities: ReadonlyArray<Capability>) {
  return QUICK_ACTIONS.filter((action) =>
    capabilities.includes(action.capability),
  )
}
