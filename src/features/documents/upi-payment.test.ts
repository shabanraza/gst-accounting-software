import { describe, expect, test } from 'vitest'

import { buildUpiUri, isValidUpiId } from '#/features/documents/upi-payment.ts'

describe('isValidUpiId', () => {
  test.each(['shop@okhdfc', 'ram.sons-01@ybl', 'a_b@paytm', '9876543210@upi'])(
    'accepts %s',
    (vpa) => {
      expect(isValidUpiId(vpa)).toBe(true)
    },
  )

  test.each([
    '',
    'shop',
    '@okhdfc',
    'a@okhdfc',
    'shop@',
    'shop@ok1',
    'shop@okhdfc.com',
    'shop @okhdfc',
    'shop@ok@hdfc',
    'shop@okhdfc&am=1',
    `${'a'.repeat(257)}@okhdfc`,
  ])('rejects %j', (vpa) => {
    expect(isValidUpiId(vpa)).toBe(false)
  })
})

describe('buildUpiUri', () => {
  test('builds a pay URI with the outstanding amount and invoice note', () => {
    expect(
      buildUpiUri({
        vpa: 'shop@okhdfc',
        payeeName: 'Shaban Textiles',
        amount: '2520',
        note: 'INV-1001',
      }),
    ).toBe(
      'upi://pay?pa=shop@okhdfc&pn=Shaban%20Textiles&am=2520.00&cu=INR&tn=INV-1001',
    )
  })

  test('formats the amount to two decimals, rounding half up', () => {
    const uri = buildUpiUri({
      vpa: 'shop@okhdfc',
      payeeName: 'A',
      amount: '10.005',
      note: '1',
    })
    expect(uri).toContain('&am=10.01&')
    expect(
      buildUpiUri({
        vpa: 'shop@okhdfc',
        payeeName: 'A',
        amount: '0.5',
        note: '1',
      }),
    ).toContain('&am=0.50&')
  })

  test('encodes special characters in the payee name and note', () => {
    const uri = buildUpiUri({
      vpa: 'shop@okhdfc',
      payeeName: 'Ram & Sons #1 = best?',
      amount: '100',
      note: 'INV/2026-27/001',
    })
    expect(uri).toBe(
      'upi://pay?pa=shop@okhdfc&pn=Ram%20%26%20Sons%20%231%20%3D%20best%3F&am=100.00&cu=INR&tn=INV%2F2026-27%2F001',
    )
  })

  test('trims the UPI ID', () => {
    expect(
      buildUpiUri({
        vpa: '  shop@okhdfc ',
        payeeName: 'A',
        amount: '1',
        note: 'x',
      }),
    ).toContain('pa=shop@okhdfc&')
  })

  test.each(['', 'shop', 'shop@okhdfc&am=1'])(
    'returns null for a missing or invalid UPI ID %j',
    (vpa) => {
      expect(
        buildUpiUri({ vpa, payeeName: 'A', amount: '100', note: 'x' }),
      ).toBeNull()
    },
  )

  test.each(['0', '0.00', '0.004', '-5', '', 'abc', 'NaN', 'Infinity'])(
    'returns null when nothing is payable (%j)',
    (amount) => {
      expect(
        buildUpiUri({ vpa: 'shop@okhdfc', payeeName: 'A', amount, note: 'x' }),
      ).toBeNull()
    },
  )
})
