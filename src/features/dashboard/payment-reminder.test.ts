import { describe, expect, test } from 'vitest'

import {
  paymentReminderLink,
  whatsappNumber,
} from '#/features/dashboard/payment-reminder.ts'

describe('whatsappNumber', () => {
  test('adds the India code to a 10-digit mobile number', () => {
    expect(whatsappNumber('98765 43210')).toBe('919876543210')
    expect(whatsappNumber('098765-43210')).toBe('919876543210')
  })

  test('keeps a number that already has the India code', () => {
    expect(whatsappNumber('+91 98765 43210')).toBe('919876543210')
  })

  test('rejects landlines, short numbers and blanks', () => {
    expect(whatsappNumber('022 2345 678')).toBeNull()
    expect(whatsappNumber('12345')).toBeNull()
    expect(whatsappNumber('')).toBeNull()
    expect(whatsappNumber(undefined)).toBeNull()
  })
})

describe('paymentReminderLink', () => {
  test('opens WhatsApp with a polite reminder naming the amount and company', () => {
    const link = paymentReminderLink({
      phone: '98765 43210',
      partyName: 'Acme Traders',
      amount: '1180.00',
      companyName: 'Sharma Electricals',
    })

    expect(link).not.toBeNull()
    const url = new URL(link ?? '')
    expect(url.origin + url.pathname).toBe('https://wa.me/919876543210')
    expect(url.searchParams.get('text')).toBe(
      'Hello Acme Traders, this is a reminder from Sharma Electricals that ₹1,180.00 is overdue on your account. Please arrange the payment at your earliest convenience. Thank you.',
    )
  })

  test('returns null when the party has no usable mobile number', () => {
    expect(
      paymentReminderLink({
        phone: '',
        partyName: 'Acme Traders',
        amount: '1180.00',
        companyName: 'Sharma Electricals',
      }),
    ).toBeNull()
  })
})
