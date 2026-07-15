import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'

import {
  buildVoucherPrintUrl,
  buildVoucherShareMessage,
  buildWhatsAppShareUrl,
  type VoucherShareKind,
} from '@/lib/voucher-share-urls'

export type { VoucherShareKind } from '@/lib/voucher-share-urls'
export {
  buildVoucherPrintPath,
  buildVoucherPrintUrl,
  buildVoucherShareMessage,
  buildWhatsAppShareUrl,
} from '@/lib/voucher-share-urls'

export async function openVoucherPrintPage(kind: VoucherShareKind, id: string) {
  const url = `${buildVoucherPrintUrl(kind, id)}?autoprint=1`
  await WebBrowser.openBrowserAsync(url)
}

export async function shareVoucherOnWhatsApp(input: {
  kind: VoucherShareKind
  number: string
  companyName: string
  amount: string
  id: string
}) {
  const message = buildVoucherShareMessage(input)
  const url = buildWhatsAppShareUrl(message)
  const canOpen = await Linking.canOpenURL(url)
  if (!canOpen) {
    throw new Error('WhatsApp is not available on this device.')
  }
  await Linking.openURL(url)
}
