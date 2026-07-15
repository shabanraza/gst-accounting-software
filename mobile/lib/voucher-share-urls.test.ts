import { describe, expect, it } from 'vitest'

import {
  buildVoucherPrintPath,
  buildVoucherPrintUrl,
  buildVoucherShareMessage,
  buildWhatsAppShareUrl,
} from './voucher-share-urls.ts'

describe('voucher-share-urls', () => {
  it('builds print paths and share message', () => {
    expect(buildVoucherPrintPath('sales', 'invoice-1')).toBe(
      '/app/sales/invoice-1/print',
    )
    expect(buildVoucherPrintUrl('purchase', 'bill-1')).toBe(
      'http://localhost:3000/app/purchases/bill-1/print',
    )

    const message = buildVoucherShareMessage({
      kind: 'sales',
      number: 'INV-0001',
      companyName: 'Acme',
      amount: '1000.00',
      id: 'invoice-1',
    })

    expect(message).toContain('Invoice INV-0001')
    expect(message).toContain('/app/sales/invoice-1/print')
    expect(buildWhatsAppShareUrl(message)).toContain('https://wa.me/?text=')
  })
})
