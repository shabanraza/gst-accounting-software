import { formatInr } from '#/lib/format-inr.ts'

/**
 * An Indian mobile number in the digits-only form WhatsApp links expect
 * (`91` + 10 digits), or null when the value is not a mobile number.
 */
export function whatsappNumber(phone: string | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  const local =
    digits.length === 12 && digits.startsWith('91')
      ? digits.slice(2)
      : digits.length === 11 && digits.startsWith('0')
        ? digits.slice(1)
        : digits
  return /^[6-9]\d{9}$/.test(local) ? `91${local}` : null
}

/** A wa.me link with a ready-to-send payment reminder, or null without a mobile number. */
export function paymentReminderLink(input: {
  phone: string | undefined
  partyName: string
  amount: string
  companyName: string
}): string | null {
  const number = whatsappNumber(input.phone)
  if (!number) return null

  const text = `Hello ${input.partyName}, this is a reminder from ${input.companyName} that ${formatInr(input.amount)} is overdue on your account. Please arrange the payment at your earliest convenience. Thank you.`
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`
}
