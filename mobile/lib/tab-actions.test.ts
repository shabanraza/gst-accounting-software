import { describe, expect, it } from 'vitest'

import {
  PURCHASES_TAB_ACTIONS,
  SALES_TAB_ACTIONS,
  STOCK_TAB_ACTIONS,
  TAB_HUB_CONFIG,
} from './tab-actions.ts'

describe('tab action grids', () => {
  it('defines sales tab quick links', () => {
    expect(SALES_TAB_ACTIONS.map((item) => item.id)).toEqual([
      'new-invoice',
      'quotations',
      'returns',
      'parties',
    ])
    expect(SALES_TAB_ACTIONS[0]?.href).toBe('/(app)/sales/new')
  })

  it('defines purchases tab quick links', () => {
    expect(PURCHASES_TAB_ACTIONS.map((item) => item.id)).toContain('ocr')
    expect(PURCHASES_TAB_ACTIONS.map((item) => item.id)).toContain('new-bill')
  })

  it('defines stock tab quick links', () => {
    expect(STOCK_TAB_ACTIONS.map((item) => item.id)).toContain('items')
    expect(STOCK_TAB_ACTIONS.map((item) => item.id)).toContain('godowns')
  })

  it('maps tab hub config for primary tab modules', () => {
    expect(Object.keys(TAB_HUB_CONFIG)).toEqual(['sales', 'purchases', 'inventory'])
    expect(TAB_HUB_CONFIG.sales?.listTitle).toBe('Sales invoices')
  })
})
