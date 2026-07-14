const SESSION_KEY = 'gstr2b-purchase-prefill'

export type Gstr2bPurchasePrefill = {
  supplierGstin?: string
  supplierBillNumber: string
  billDate?: string
  taxableAmount?: string
}

export function storeGstr2bPurchasePrefill(prefill: Gstr2bPurchasePrefill) {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(prefill))
}

export function consumeGstr2bPurchasePrefill(): Gstr2bPurchasePrefill | null {
  if (typeof window === 'undefined') return null
  const raw = sessionStorage.getItem(SESSION_KEY)
  if (!raw) return null
  sessionStorage.removeItem(SESSION_KEY)
  try {
    return JSON.parse(raw) as Gstr2bPurchasePrefill
  } catch {
    return null
  }
}
