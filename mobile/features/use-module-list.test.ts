import { describe, expect, it } from 'vitest'

import { getModuleById } from '@/lib/nav-config'

describe('useModuleList configuration', () => {
  it('maps sales invoices to the sales.list procedure', () => {
    expect(getModuleById('sales')).toMatchObject({
      trpcNamespace: 'sales',
      listProcedure: 'list',
    })
  })

  it('maps OCR review to the ocr.list procedure', () => {
    expect(getModuleById('ocr')).toMatchObject({
      trpcNamespace: 'ocr',
      listProcedure: 'list',
    })
  })

  it('maps purchases to purchases.list procedure', () => {
    expect(getModuleById('purchases')).toMatchObject({
      trpcNamespace: 'purchases',
      listProcedure: 'list',
      createPath: '/(app)/purchases/new',
    })
  })

  it('maps reports module without list procedure', () => {
    const reports = getModuleById('reports')
    expect(reports?.id).toBe('reports')
    expect(reports?.listProcedure).toBeUndefined()
  })
})
