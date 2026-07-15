import type { Ionicons } from '@expo/vector-icons'

import type { MobileNavModule } from '@/lib/nav-config'

const MODULE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  payments: 'wallet-outline',
  'bank-reconciliation': 'card-outline',
  expenses: 'cash-outline',
  parties: 'people-outline',
  items: 'cube-outline',
  godowns: 'business-outline',
  inventory: 'layers-outline',
  reports: 'bar-chart-outline',
  journal: 'book-outline',
  'chart-of-accounts': 'list-outline',
  'company-profile': 'business-outline',
  companies: 'briefcase-outline',
  imports: 'cloud-upload-outline',
  settings: 'settings-outline',
  sales: 'document-text-outline',
  'sales-documents': 'documents-outline',
  returns: 'return-down-back-outline',
  purchases: 'receipt-outline',
  'purchase-orders': 'clipboard-outline',
  'purchase-grns': 'cube-outline',
  ocr: 'camera-outline',
}

export function getModuleIcon(
  module: Pick<MobileNavModule, 'id'>,
): keyof typeof Ionicons.glyphMap {
  return MODULE_ICONS[module.id] ?? 'chevron-forward-outline'
}
