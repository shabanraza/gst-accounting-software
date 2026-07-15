import type { ActionGridItem } from '@/components/action-grid'

export const QUICK_CREATE_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'invoice',
    label: 'Invoice',
    icon: 'document-text-outline',
    accent: 'blue',
    href: '/(app)/sales/new',
  },
  {
    id: 'receipt',
    label: 'Receipt',
    icon: 'wallet-outline',
    accent: 'green',
    href: '/(app)/module/payments',
  },
  {
    id: 'purchase',
    label: 'Purchase',
    icon: 'cart-outline',
    accent: 'orange',
    href: '/(app)/purchases/new',
  },
  {
    id: 'party',
    label: 'Party',
    icon: 'people-outline',
    accent: 'blue',
    href: '/(app)/module/parties',
  },
  {
    id: 'item',
    label: 'Item',
    icon: 'cube-outline',
    accent: 'amber',
    href: '/(app)/module/items',
  },
]

export const VIEW_SHARE_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'sales-list',
    label: 'Sales',
    icon: 'trending-up-outline',
    accent: 'blue',
    href: '/(app)/(tabs)/sales',
  },
  {
    id: 'purchases-list',
    label: 'Purchases',
    icon: 'receipt-outline',
    accent: 'orange',
    href: '/(app)/(tabs)/purchases',
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: 'layers-outline',
    accent: 'green',
    href: '/(app)/(tabs)/stock',
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: 'business-outline',
    accent: 'blue',
    href: '/(app)/module/parties',
  },
]

export const REPORT_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'gst-reports',
    label: 'GST',
    icon: 'bar-chart-outline',
    accent: 'violet',
    href: '/(app)/module/reports',
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: 'book-outline',
    accent: 'blue',
    href: '/(app)/module/journal',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'wallet-outline',
    accent: 'green',
    href: '/(app)/module/expenses',
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: 'card-outline',
    accent: 'blue',
    href: '/(app)/module/bank-reconciliation',
  },
]
