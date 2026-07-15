import { describe, expect, it } from 'vitest'

import {
  QUICK_CREATE_ACTIONS,
  REPORT_ACTIONS,
  VIEW_SHARE_ACTIONS,
} from './dashboard-actions.ts'

describe('dashboard action grids', () => {
  it('defines quick create routes for core vouchers and masters', () => {
    expect(QUICK_CREATE_ACTIONS.map((item) => item.id)).toEqual([
      'invoice',
      'receipt',
      'purchase',
      'party',
      'item',
    ])
    expect(QUICK_CREATE_ACTIONS[0]?.href).toBe('/(app)/sales/new')
    expect(QUICK_CREATE_ACTIONS.every((item) => item.accent)).toBe(true)
    expect(QUICK_CREATE_ACTIONS.map((item) => item.accent)).toEqual([
      'blue',
      'red',
      'orange',
      'blue',
      'orange',
    ])
  })

  it('defines view and report navigation stubs', () => {
    expect(VIEW_SHARE_ACTIONS.length).toBeGreaterThanOrEqual(4)
    expect(REPORT_ACTIONS.map((item) => item.id)).toContain('gst-reports')
  })
})
