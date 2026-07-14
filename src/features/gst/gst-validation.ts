const gstinPattern = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/

export function isValidGstin(value: string): boolean {
  return gstinPattern.test(value.trim().toUpperCase())
}

const hsnPattern = /^\d{4}(\d{2}){0,2}$/

export function isValidHsnCode(value: string): boolean {
  return hsnPattern.test(value.trim())
}

export function stateCodeFromGstin(gstin: string): string | null {
  return isValidGstin(gstin) ? gstin.trim().slice(0, 2) : null
}
