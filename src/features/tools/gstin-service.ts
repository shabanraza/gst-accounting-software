import { GST_STATE_NAMES } from '#/features/documents/gst-invoice-format.ts'

const CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'

const GSTIN_PATTERN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z][A-Z][0-9A-Z]$/

/** The 4th character of a PAN says what kind of taxpayer holds it. */
const PAN_ENTITY_TYPES: Record<string, string> = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family (HUF)',
  F: 'Firm / LLP',
  A: 'Association of Persons (AOP)',
  T: 'Trust',
  B: 'Body of Individuals (BOI)',
  L: 'Local authority',
  J: 'Artificial juridical person',
  G: 'Government',
}

export type GstinResult =
  | {
      valid: true
      gstin: string
      stateCode: string
      stateName: string
      pan: string
      entityType: string
      registrationNumber: string
    }
  | {
      valid: false
      reason: 'length' | 'format' | 'state' | 'checksum'
      expectedCheckDigit?: string
    }

/** Mod-36 check digit used by the GST network for the 15th character. */
export function gstinCheckDigit(first14: string): string {
  let sum = 0
  for (let index = 0; index < 14; index += 1) {
    const value = CHARSET.indexOf(first14.charAt(index))
    const product = value * (index % 2 === 0 ? 1 : 2)
    sum += Math.floor(product / 36) + (product % 36)
  }
  return CHARSET.charAt((36 - (sum % 36)) % 36)
}

export function validateGstin(input: string): GstinResult {
  const gstin = input.replace(/\s+/g, '').toUpperCase()
  if (gstin.length !== 15) return { valid: false, reason: 'length' }
  if (!GSTIN_PATTERN.test(gstin)) return { valid: false, reason: 'format' }

  const stateCode = gstin.slice(0, 2)
  const stateName = GST_STATE_NAMES[stateCode]
  if (!stateName) return { valid: false, reason: 'state' }

  const expectedCheckDigit = gstinCheckDigit(gstin.slice(0, 14))
  if (expectedCheckDigit !== gstin.charAt(14)) {
    return { valid: false, reason: 'checksum', expectedCheckDigit }
  }

  const pan = gstin.slice(2, 12)
  return {
    valid: true,
    gstin,
    stateCode,
    stateName,
    pan,
    entityType: PAN_ENTITY_TYPES[pan.charAt(3)] ?? 'Other',
    registrationNumber: gstin.charAt(12),
  }
}
