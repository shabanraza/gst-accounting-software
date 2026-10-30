import type { LucideIcon } from 'lucide-react'
import {
  BanknoteIcon,
  BookOpenIcon,
  BoxesIcon,
  BriefcaseBusinessIcon,
  Building2Icon,
  ClipboardListIcon,
  ContactIcon,
  CreditCardIcon,
  DatabaseIcon,
  FileBarChartIcon,
  FileSignatureIcon,
  FileTextIcon,
  LandmarkIcon,
  LayersIcon,
  LayoutDashboardIcon,
  ListTreeIcon,
  PackageCheckIcon,
  PackageIcon,
  ReceiptIcon,
  ReceiptIndianRupeeIcon,
  ScanTextIcon,
  Settings2Icon,
  ShoppingCartIcon,
  TrendingUpIcon,
  Undo2Icon,
  UploadIcon,
  UsersIcon,
  WalletIcon,
  WarehouseIcon,
  WrenchIcon,
} from 'lucide-react'

import type { Capability } from '#/features/companies/membership-service.ts'

export type AppNavPath =
  | '/app/dashboard'
  | '/app/masters/chart-of-accounts'
  | '/app/masters/companies'
  | '/app/masters/company-profile'
  | '/app/masters/parties'
  | '/app/masters/items'
  | '/app/masters/godowns'
  | '/app/accounting/journal'
  | '/app/sales'
  | '/app/sales/documents'
  | '/app/purchases'
  | '/app/purchase-orders'
  | '/app/purchase-grns'
  | '/app/payments'
  | '/app/bank-reconciliation'
  | '/app/expenses'
  | '/app/returns'
  | '/app/inventory'
  | '/app/imports'
  | '/app/ocr'
  | '/app/reports'
  | '/app/settings'

export type AppNavItem = {
  label: string
  path: AppNavPath
  icon: LucideIcon
  requiredCapability?: Capability
}

export type AppNavSection =
  | ({ kind: 'link' } & AppNavItem)
  | {
      kind: 'group'
      label: string
      icon: LucideIcon
      items: [AppNavItem, ...Array<AppNavItem>]
    }

export const appNav: Array<AppNavSection> = [
  {
    kind: 'link',
    label: 'Dashboard',
    path: '/app/dashboard',
    icon: LayoutDashboardIcon,
  },
  {
    kind: 'group',
    label: 'Sales',
    icon: TrendingUpIcon,
    items: [
      { label: 'Sales invoices', path: '/app/sales', icon: FileTextIcon },
      {
        label: 'Quotations & orders',
        path: '/app/sales/documents',
        icon: FileSignatureIcon,
      },
      { label: 'Returns', path: '/app/returns', icon: Undo2Icon },
    ],
  },
  {
    kind: 'group',
    label: 'Purchase',
    icon: ShoppingCartIcon,
    items: [
      { label: 'Purchase bills', path: '/app/purchases', icon: ReceiptIcon },
      { label: 'Scanned bills', path: '/app/ocr', icon: ScanTextIcon },
      {
        label: 'Purchase orders',
        path: '/app/purchase-orders',
        icon: ClipboardListIcon,
      },
      {
        label: 'Goods receipt (GRN)',
        path: '/app/purchase-grns',
        icon: PackageCheckIcon,
      },
    ],
  },
  {
    kind: 'group',
    label: 'Payments & banking',
    icon: WalletIcon,
    items: [
      {
        label: 'Receipts & payments',
        path: '/app/payments',
        icon: BanknoteIcon,
      },
      {
        label: 'Bank reconciliation',
        path: '/app/bank-reconciliation',
        icon: LandmarkIcon,
        requiredCapability: 'reconcile_bank',
      },
      { label: 'Expenses', path: '/app/expenses', icon: CreditCardIcon },
    ],
  },
  {
    kind: 'group',
    label: 'Inventory',
    icon: BoxesIcon,
    items: [
      { label: 'Items', path: '/app/masters/items', icon: PackageIcon },
      { label: 'Godowns', path: '/app/masters/godowns', icon: WarehouseIcon },
      { label: 'Stock', path: '/app/inventory', icon: LayersIcon },
    ],
  },
  {
    kind: 'group',
    label: 'Parties',
    icon: UsersIcon,
    items: [
      {
        label: 'Customers & suppliers',
        path: '/app/masters/parties',
        icon: ContactIcon,
      },
    ],
  },
  {
    kind: 'group',
    label: 'GST & reports',
    icon: ReceiptIndianRupeeIcon,
    items: [
      { label: 'Reports', path: '/app/reports', icon: FileBarChartIcon },
      { label: 'Journal', path: '/app/accounting/journal', icon: BookOpenIcon },
    ],
  },
  {
    kind: 'group',
    label: 'Masters',
    icon: DatabaseIcon,
    items: [
      {
        label: 'Chart of accounts',
        path: '/app/masters/chart-of-accounts',
        icon: ListTreeIcon,
      },
      {
        label: 'Company profile',
        path: '/app/masters/company-profile',
        icon: Building2Icon,
      },
      {
        label: 'Companies',
        path: '/app/masters/companies',
        icon: BriefcaseBusinessIcon,
      },
    ],
  },
  {
    kind: 'group',
    label: 'Utilities',
    icon: WrenchIcon,
    items: [{ label: 'Import data', path: '/app/imports', icon: UploadIcon }],
  },
  {
    kind: 'link',
    label: 'Settings',
    path: '/app/settings',
    icon: Settings2Icon,
  },
]

export const appNavItems: Array<AppNavItem> = appNav.flatMap((section) =>
  section.kind === 'link'
    ? [{ label: section.label, path: section.path, icon: section.icon }]
    : section.items,
)

export function filterAppNav(
  sections: Array<AppNavSection>,
  capabilities: Array<Capability>,
): Array<AppNavSection> {
  const capabilitySet = new Set(capabilities)

  return sections
    .map((section) => {
      if (section.kind === 'link') {
        if (
          section.requiredCapability &&
          !capabilitySet.has(section.requiredCapability)
        ) {
          return null
        }
        return section
      }

      const items = section.items.filter(
        (item) =>
          !item.requiredCapability ||
          capabilitySet.has(item.requiredCapability),
      )
      if (items.length === 0) return null

      return {
        ...section,
        items: items as [AppNavItem, ...Array<AppNavItem>],
      }
    })
    .filter((section): section is AppNavSection => section !== null)
}

export function isAppNavPathActive(pathname: string, path: AppNavPath) {
  const normalizedPathname = pathname.replace(/\/$/, '') || '/'

  if (path === '/app/sales') {
    return (
      normalizedPathname === path ||
      (normalizedPathname.startsWith('/app/sales/') &&
        !normalizedPathname.startsWith('/app/sales/documents'))
    )
  }

  if (path === '/app/sales/documents') {
    return (
      normalizedPathname === path || normalizedPathname.startsWith(`${path}/`)
    )
  }

  if (path === '/app/purchases') {
    return (
      normalizedPathname === path || normalizedPathname.startsWith(`${path}/`)
    )
  }

  // Sibling routes under /app/masters/ must not prefix-match each other.
  if (path.startsWith('/app/masters/')) {
    return normalizedPathname === path
  }

  return (
    normalizedPathname === path || normalizedPathname.startsWith(`${path}/`)
  )
}

export function navLinkActiveOptions(path: AppNavPath) {
  if (
    path === '/app/sales' ||
    path === '/app/sales/documents' ||
    path === '/app/purchases'
  ) {
    return undefined
  }

  return { exact: true } as const
}
