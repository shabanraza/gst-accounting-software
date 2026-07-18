import type { ActionGridItem } from '@/components/dashboard/action-grid'
import { Ionicons } from '@expo/vector-icons'

export const SALES_TAB_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'new-invoice',
    label: 'New\nInvoice',
    icon: 'document-text-outline',
    href: '/(app)/sales/new',
    accent: 'sales',
  },
  {
    id: 'quotations',
    label: 'Quotations\n& orders',
    icon: 'documents-outline',
    href: '/(app)/module/sales-documents',
  },
  {
    id: 'returns',
    label: 'Credit /\nDebit notes',
    icon: 'return-down-back-outline',
    href: '/(app)/module/returns',
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: 'people-outline',
    href: '/(app)/module/parties',
    accent: 'sales',
  },
]

export const PURCHASES_TAB_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'new-bill',
    label: 'New\nBill',
    icon: 'cart-outline',
    href: '/(app)/purchases/new',
    accent: 'purchases',
  },
  {
    id: 'ocr',
    label: 'OCR\nCapture',
    icon: 'camera-outline',
    href: '/(app)/purchases/ocr',
    accent: 'reports',
  },
  {
    id: 'purchase-orders',
    label: 'Purchase\norders',
    icon: 'clipboard-outline',
    href: '/(app)/module/purchase-orders',
  },
  {
    id: 'grn',
    label: 'Goods\nreceipt',
    icon: 'cube-outline',
    href: '/(app)/module/purchase-grns',
    accent: 'purchases',
  },
]

export const STOCK_TAB_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'items',
    label: 'Items',
    icon: 'cube-outline',
    href: '/(app)/module/items',
    accent: 'stock',
  },
  {
    id: 'godowns',
    label: 'Godowns',
    icon: 'business-outline',
    href: '/(app)/module/godowns',
  },
  {
    id: 'stock-ledger',
    label: 'Stock\nledger',
    icon: 'layers-outline',
    href: '/(app)/(tabs)/stock',
    accent: 'stock',
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: 'people-outline',
    href: '/(app)/module/parties',
    accent: 'sales',
  },
]

export const TAB_HUB_CONFIG: Record<
  string,
  {
    actions: Array<ActionGridItem>
    listTitle: string
    listIcon: keyof typeof Ionicons.glyphMap
  }
> = {
  sales: {
    actions: SALES_TAB_ACTIONS,
    listTitle: 'Sales invoices',
    listIcon: 'document-text-outline',
  },
  purchases: {
    actions: PURCHASES_TAB_ACTIONS,
    listTitle: 'Purchase bills',
    listIcon: 'receipt-outline',
  },
  inventory: {
    actions: STOCK_TAB_ACTIONS,
    listTitle: 'Stock balances',
    listIcon: 'layers-outline',
  },
}
