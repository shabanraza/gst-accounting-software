import Decimal from 'decimal.js'

import { formatIndianDate } from '#/features/documents/gst-invoice-format.ts'

export type ReminderLanguage = 'en' | 'hi'
export type ReminderTone = 'gentle' | 'firm'

export type ReminderInput = {
  customerName: string
  businessName: string
  amount: string
  dueDate: string
  upiId: string
  language: ReminderLanguage
  tone: ReminderTone
}

function toAmount(value: string): Decimal {
  const trimmed = value.trim()
  return /^\d+(\.\d+)?$/.test(trimmed) ? new Decimal(trimmed) : new Decimal(0)
}

/** Display-only formatting with Indian digit grouping (12,34,567.50). */
export function formatInrAmount(value: string): string {
  const [whole = '0', fraction = '00'] = toAmount(value).toFixed(2).split('.')
  const lastThree = whole.slice(-3)
  const rest = whole.slice(0, -3)
  const grouped = rest
    ? `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',')},${lastThree}`
    : lastThree
  return `₹${grouped}.${fraction}`
}

export function buildReminderMessage(input: ReminderInput): string {
  const name = input.customerName.trim() || (input.language === 'hi' ? 'ग्राहक' : 'there')
  const business = input.businessName.trim()
  const amount = formatInrAmount(input.amount)
  const date = input.dueDate.trim() ? formatIndianDate(input.dueDate) : ''
  const upiId = input.upiId.trim()

  const lines: Array<string> = []

  if (input.language === 'hi') {
    lines.push(`नमस्ते ${name} जी,`)
    if (input.tone === 'gentle') {
      lines.push(
        `${business ? `${business} की ओर से ` : ''}आपको याद दिलाना था कि ${amount} का भुगतान बाकी है।${date ? ` भुगतान की तारीख ${date} है।` : ''}`,
      )
      lines.push('सुविधा अनुसार भुगतान कर दें। धन्यवाद!')
    } else {
      lines.push(
        `${amount} का भुगतान${date ? ` ${date} से` : ''} बकाया है।${business ? ` (${business})` : ''}`,
      )
      lines.push('कृपया आज ही भुगतान करें और भुगतान के बाद हमें सूचित करें।')
    }
    if (upiId) lines.push(`UPI से भुगतान करें: ${upiId}`)
  } else {
    lines.push(`Hi ${name},`)
    if (input.tone === 'gentle') {
      lines.push(
        `This is a friendly reminder${business ? ` from ${business}` : ''} that ${amount} is pending.${date ? ` It is due on ${date}.` : ''}`,
      )
      lines.push('Please pay at your convenience. Thank you!')
    } else {
      lines.push(
        `${amount} is overdue${date ? ` since ${date}` : ''}${business ? ` on your account with ${business}` : ''}.`,
      )
      lines.push('Please clear the payment today and share the payment reference once done.')
    }
    if (upiId) lines.push(`Pay by UPI: ${upiId}`)
  }

  return lines.join('\n')
}

/** Opens WhatsApp with the message; adds +91 to a 10-digit Indian number. */
export function buildWhatsAppLink(message: string, phone: string): string {
  const digits = phone.replace(/\D/g, '')
  const number = digits.length === 10 ? `91${digits}` : digits
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}
