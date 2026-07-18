import type { ActionGridItem } from '@/components/dashboard/action-grid'

export const QUICK_CREATE_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'invoice',
    label: 'New\nInvoice',
    icon: 'document-text-outline',
    href: '/(app)/sales/new',
    accent: 'sales',
  },
  {
    id: 'receipt',
    label: 'New\nReceipt',
    icon: 'wallet-outline',
    href: '/(app)/module/payments',
    accent: 'overdue',
  },
  {
    id: 'purchase',
    label: 'New\nPurchase',
    icon: 'cart-outline',
    href: '/(app)/purchases/new',
    accent: 'purchases',
  },
  {
    id: 'party',
    label: 'New\nParty',
    icon: 'people-outline',
    href: '/(app)/module/parties',
    accent: 'sales',
  },
  {
    id: 'item',
    label: 'New\nItem',
    icon: 'cube-outline',
    href: '/(app)/module/items',
    accent: 'stock',
  },
]

export const VIEW_SHARE_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'sales-list',
    label: 'Sales',
    icon: 'trending-up-outline',
    href: '/(app)/(tabs)/sales',
    accent: 'sales',
  },
  {
    id: 'purchases-list',
    label: 'Purchases',
    icon: 'receipt-outline',
    href: '/(app)/(tabs)/purchases',
    accent: 'purchases',
  },
  {
    id: 'stock',
    label: 'Stock',
    icon: 'layers-outline',
    href: '/(app)/(tabs)/stock',
    accent: 'stock',
  },
  {
    id: 'parties',
    label: 'Parties',
    icon: 'business-outline',
    href: '/(app)/module/parties',
  },
]

export const REPORT_ACTIONS: Array<ActionGridItem> = [
  {
    id: 'gst-reports',
    label: 'GST',
    icon: 'bar-chart-outline',
    href: '/(app)/module/reports',
    accent: 'reports',
  },
  {
    id: 'journal',
    label: 'Journal',
    icon: 'book-outline',
    href: '/(app)/module/journal',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: 'wallet-outline',
    href: '/(app)/module/expenses',
    accent: 'overdue',
  },
  {
    id: 'banking',
    label: 'Banking',
    icon: 'card-outline',
    href: '/(app)/module/bank-reconciliation',
  },
]
