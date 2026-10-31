import { describe, expect, test } from 'vitest'

import {
  buildReminderMessage,
  buildWhatsAppLink,
  formatInrAmount,
} from '#/features/tools/payment-reminder-service.ts'

describe('formatInrAmount', () => {
  test('uses Indian digit grouping', () => {
    expect(formatInrAmount('1234567.5')).toBe('₹12,34,567.50')
  })
})

describe('buildReminderMessage', () => {
  const base = {
    customerName: 'Ramesh',
    businessName: 'Sharma Traders',
    amount: '12500',
    dueDate: '2026-11-05',
    upiId: '',
  }

  test('writes a gentle English reminder with the amount and date', () => {
    const message = buildReminderMessage({ ...base, language: 'en', tone: 'gentle' })
    expect(message).toContain('Ramesh')
    expect(message).toContain('Sharma Traders')
    expect(message).toContain('₹12,500.00')
    expect(message).toContain('05-11-2026')
    expect(message).not.toContain('UPI')
  })

  test('writes Hindi and includes the UPI ID when given', () => {
    const message = buildReminderMessage({
      ...base,
      upiId: 'sharma@okbank',
      language: 'hi',
      tone: 'firm',
    })
    expect(message).toContain('भुगतान')
    expect(message).toContain('sharma@okbank')
  })

  test('leaves out the date sentence when there is no due date', () => {
    const message = buildReminderMessage({
      ...base,
      dueDate: '',
      language: 'en',
      tone: 'gentle',
    })
    expect(message).not.toMatch(/\d{2}-\d{2}-\d{4}/)
  })
})

describe('buildWhatsAppLink', () => {
  test('WhatsApp link encodes the text and normalises an Indian number', () => {
    expect(buildWhatsAppLink('Hi & bye', '98765 43210')).toBe(
      'https://wa.me/919876543210?text=Hi%20%26%20bye',
    )
    expect(buildWhatsAppLink('Hi', '')).toBe('https://wa.me/?text=Hi')
  })
})
