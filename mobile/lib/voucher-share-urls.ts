import { formatInr } from '@/lib/format-inr'
import { resolveApiBaseUrl } from '@/lib/env'

export type VoucherShareKind = 'sales' | 'purchase'

export function buildVoucherPrintPath(kind: VoucherShareKind, id: string) {
  return kind === 'sales'
    ? `/app/sales/${id}/print`
    : `/app/purchases/${id}/print`
}

export function buildVoucherPrintUrl(kind: VoucherShareKind, id: string) {
  return `${resolveApiBaseUrl()}${buildVoucherPrintPath(kind, id)}`
}

export function buildVoucherShareMessage(input: {
  kind: VoucherShareKind
  number: string
  companyName: string
  amount: string
  id: string
}) {
  const label = input.kind === 'sales' ? 'Invoice' : 'Bill'
  const printUrl = buildVoucherPrintUrl(input.kind, input.id)
  return `${label} ${input.number} from ${input.companyName} for ${formatInr(input.amount)}. ${printUrl}`
}

export function buildWhatsAppShareUrl(message: string) {
  return `https://wa.me/?text=${encodeURIComponent(message)}`
}
