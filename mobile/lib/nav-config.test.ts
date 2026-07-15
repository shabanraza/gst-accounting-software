import { describe, expect, it } from 'vitest'

import { MOBILE_NAV_MODULES, getModuleById } from './nav-config.ts'

describe('mobile nav config', () => {
  it('covers every major web app-shell module', () => {
    const moduleIds = MOBILE_NAV_MODULES.map((entry) => entry.id)

    expect(moduleIds).toEqual(
      expect.arrayContaining([
        'dashboard',
        'sales',
        'sales-documents',
        'returns',
        'purchases',
        'purchase-orders',
        'purchase-grns',
        'ocr',
        'payments',
        'bank-reconciliation',
        'expenses',
        'items',
        'godowns',
        'inventory',
        'parties',
        'reports',
        'journal',
        'chart-of-accounts',
        'company-profile',
        'companies',
        'imports',
        'settings',
      ]),
    )
  })

  it('resolves a module by id', () => {
    expect(getModuleById('sales')?.title).toBe('Sales invoices')
  })
})
