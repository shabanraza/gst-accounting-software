import type { TRPCRouter } from '@accounting/api-client/types'

type TrpcNamespace = keyof TRPCRouter & string

type MobileNavApiConfig = {
  [Namespace in TrpcNamespace]: {
    trpcNamespace: Namespace
    listProcedure: keyof TRPCRouter[Namespace] & string
  }
}[TrpcNamespace]

type MobileNavLocalConfig = {
  trpcNamespace?: undefined
  listProcedure?: undefined
}

export type MobileNavModule = {
  id: string
  title: string
  tab: 'home' | 'sales' | 'purchase' | 'stock' | 'more'
  path: string
  createPath?: string
} & (MobileNavApiConfig | MobileNavLocalConfig)

export const MOBILE_NAV_MODULES: Array<MobileNavModule> = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    tab: 'home',
    path: '/(app)/(tabs)/dashboard',
    trpcNamespace: 'dashboard',
    listProcedure: 'getOwnerSnapshot',
  },
  {
    id: 'sales',
    title: 'Sales invoices',
    tab: 'sales',
    path: '/(app)/(tabs)/sales',
    trpcNamespace: 'sales',
    listProcedure: 'list',
    createPath: '/(app)/sales/new',
  },
  {
    id: 'sales-documents',
    title: 'Quotations & orders',
    tab: 'sales',
    path: '/(app)/module/sales-documents',
    trpcNamespace: 'salesDocuments',
    listProcedure: 'list',
    createPath: '/(app)/sales-documents/new',
  },
  {
    id: 'returns',
    title: 'Returns',
    tab: 'sales',
    path: '/(app)/module/returns',
    trpcNamespace: 'returns',
    listProcedure: 'listCreditDebitNotes',
    createPath: '/(app)/returns/new',
  },
  {
    id: 'purchases',
    title: 'Purchase bills',
    tab: 'purchase',
    path: '/(app)/(tabs)/purchases',
    trpcNamespace: 'purchases',
    listProcedure: 'list',
    createPath: '/(app)/purchases/new',
  },
  {
    id: 'purchase-orders',
    title: 'Purchase orders',
    tab: 'purchase',
    path: '/(app)/module/purchase-orders',
    trpcNamespace: 'purchaseOrders',
    listProcedure: 'list',
    createPath: '/(app)/purchase-orders/new',
  },
  {
    id: 'purchase-grns',
    title: 'Goods receipt',
    tab: 'purchase',
    path: '/(app)/module/purchase-grns',
    trpcNamespace: 'purchaseGrns',
    listProcedure: 'list',
    createPath: '/(app)/purchase-grns/new',
  },
  {
    id: 'ocr',
    title: 'OCR review',
    tab: 'purchase',
    path: '/(app)/purchases/ocr',
    trpcNamespace: 'ocr',
    listProcedure: 'list',
  },
  {
    id: 'payments',
    title: 'Payments',
    tab: 'more',
    path: '/(app)/module/payments',
  },
  {
    id: 'bank-reconciliation',
    title: 'Bank reconciliation',
    tab: 'more',
    path: '/(app)/module/bank-reconciliation',
    trpcNamespace: 'banking',
    listProcedure: 'listStatements',
  },
  {
    id: 'expenses',
    title: 'Expenses',
    tab: 'more',
    path: '/(app)/module/expenses',
    trpcNamespace: 'expenses',
    listProcedure: 'list',
    createPath: '/(app)/expenses/new',
  },
  {
    id: 'items',
    title: 'Items',
    tab: 'stock',
    path: '/(app)/module/items',
    trpcNamespace: 'inventory',
    listProcedure: 'listItems',
    createPath: '/(app)/items/new',
  },
  {
    id: 'godowns',
    title: 'Godowns',
    tab: 'stock',
    path: '/(app)/module/godowns',
    trpcNamespace: 'inventory',
    listProcedure: 'listGodowns',
    createPath: '/(app)/godowns/new',
  },
  {
    id: 'inventory',
    title: 'Stock ledger',
    tab: 'stock',
    path: '/(app)/(tabs)/stock',
    trpcNamespace: 'inventory',
    listProcedure: 'listStockBalances',
  },
  {
    id: 'parties',
    title: 'Parties',
    tab: 'more',
    path: '/(app)/module/parties',
    trpcNamespace: 'parties',
    listProcedure: 'list',
    createPath: '/(app)/parties/new',
  },
  {
    id: 'reports',
    title: 'GST reports',
    tab: 'more',
    path: '/(app)/module/reports',
  },
  {
    id: 'journal',
    title: 'Journal',
    tab: 'more',
    path: '/(app)/module/journal',
    createPath: '/(app)/journal/new',
  },
  {
    id: 'chart-of-accounts',
    title: 'Chart of accounts',
    tab: 'more',
    path: '/(app)/module/chart-of-accounts',
    trpcNamespace: 'accounting',
    listProcedure: 'listLedgerAccounts',
  },
  {
    id: 'company-profile',
    title: 'Company profile',
    tab: 'more',
    path: '/(app)/module/company-profile',
  },
  {
    id: 'companies',
    title: 'Companies',
    tab: 'more',
    path: '/(app)/module/companies',
    trpcNamespace: 'companies',
    listProcedure: 'list',
  },
  {
    id: 'imports',
    title: 'Import data',
    tab: 'more',
    path: '/(app)/module/imports',
  },
  {
    id: 'settings',
    title: 'Settings',
    tab: 'more',
    path: '/(app)/module/settings',
  },
]

export function getModuleById(id: string) {
  return MOBILE_NAV_MODULES.find((entry) => entry.id === id)
}

export function getModulesForTab(
  tab: MobileNavModule['tab'],
): Array<MobileNavModule> {
  return MOBILE_NAV_MODULES.filter((entry) => entry.tab === tab)
}
