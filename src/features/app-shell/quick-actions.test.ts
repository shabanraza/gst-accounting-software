import { describe, expect, test } from 'vitest'

import {
  QUICK_ACTIONS,
  quickActionForKey,
  visibleQuickActions,
} from '#/features/app-shell/quick-actions.ts'

const key = (code: string, extra: Partial<KeyboardEventInit> = {}) => ({
  code,
  altKey: true,
  ctrlKey: false,
  metaKey: false,
  shiftKey: false,
  ...extra,
})

describe('quickActionForKey', () => {
  test('maps Alt+S, Alt+P, Alt+R and Alt+Y to sale, purchase, receipt and payment', () => {
    expect(quickActionForKey(key('KeyS'))?.key).toBe('sale')
    expect(quickActionForKey(key('KeyP'))?.key).toBe('purchase')
    expect(quickActionForKey(key('KeyR'))?.key).toBe('receipt')
    expect(quickActionForKey(key('KeyY'))?.key).toBe('payment')
  })

  test('ignores the letter without Alt, or with another modifier', () => {
    expect(quickActionForKey(key('KeyS', { altKey: false }))).toBeNull()
    expect(quickActionForKey(key('KeyS', { ctrlKey: true }))).toBeNull()
    expect(quickActionForKey(key('KeyS', { metaKey: true }))).toBeNull()
    expect(quickActionForKey(key('KeyS', { shiftKey: true }))).toBeNull()
    expect(quickActionForKey(key('KeyQ'))).toBeNull()
  })
})

describe('visibleQuickActions', () => {
  test('shows only the actions the role can post', () => {
    expect(
      visibleQuickActions(['view', 'post_sales']).map((action) => action.key),
    ).toEqual(['sale'])
    expect(visibleQuickActions(['view'])).toEqual([])
    expect(
      visibleQuickActions(['post_sales', 'post_purchase', 'post_payment']),
    ).toEqual(QUICK_ACTIONS)
  })
})
