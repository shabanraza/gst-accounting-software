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
})
