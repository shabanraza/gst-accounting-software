import type { LucideIcon } from 'lucide-react'
import {
  BanknoteIcon,
  BookOpenIcon,
  Building2Icon,
  ClipboardListIcon,
  FileBarChartIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  PackageCheckIcon,
  PackageIcon,
  ReceiptIcon,
  Settings2Icon,
  ShoppingCartIcon,
  TruckIcon,
  Undo2Icon,
  UploadIcon,
  UsersIcon,
  WarehouseIcon,
} from 'lucide-react'

export type AppNavPath =
  | '/app/dashboard'
  | '/app/masters/chart-of-accounts'
  | '/app/masters/companies'
  | '/app/masters/parties'
  | '/app/masters/items'
  | '/app/accounting/journal'
  | '/app/sales'
  | '/app/sales/documents'
  | '/app/purchases'
  | '/app/purchase-orders'
  | '/app/purchase-grns'
  | '/app/payments'
  | '/app/expenses'
  | '/app/returns'
  | '/app/inventory'
  | '/app/imports'
  | '/app/reports'
  | '/app/settings'

export type AppNavItem = {
  label: string
  path: AppNavPath
  icon: LucideIcon
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
    icon: ShoppingCartIcon,
    items: [
      { label: 'Invoices', path: '/app/sales', icon: FileTextIcon },
      {
        label: 'Quotations & orders',
        path: '/app/sales/documents',
        icon: ClipboardListIcon,
      },
      { label: 'Returns', path: '/app/returns', icon: Undo2Icon },
    ],
  },
  {
    kind: 'group',
    label: 'Purchase',
    icon: TruckIcon,
    items: [
      { label: 'Bills', path: '/app/purchases', icon: ReceiptIcon },
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
    icon: BanknoteIcon,
    items: [
      { label: 'Payments', path: '/app/payments', icon: BanknoteIcon },
      { label: 'Expenses', path: '/app/expenses', icon: ReceiptIcon },
    ],
  },
  {
    kind: 'group',
    label: 'Inventory',
    icon: WarehouseIcon,
    items: [
      { label: 'Items', path: '/app/masters/items', icon: PackageIcon },
      { label: 'Stock', path: '/app/inventory', icon: WarehouseIcon },
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
        icon: UsersIcon,
      },
    ],
  },
  {
    kind: 'group',
    label: 'GST & reports',
    icon: FileBarChartIcon,
    items: [
      { label: 'Reports', path: '/app/reports', icon: FileBarChartIcon },
      { label: 'Journal', path: '/app/accounting/journal', icon: BookOpenIcon },
    ],
  },
  {
    kind: 'group',
    label: 'Masters',
    icon: BookOpenIcon,
    items: [
      {
        label: 'Chart of accounts',
        path: '/app/masters/chart-of-accounts',
        icon: BookOpenIcon,
      },
      { label: 'Companies', path: '/app/masters/companies', icon: Building2Icon },
    ],
  },
  {
    kind: 'group',
    label: 'Utilities',
    icon: UploadIcon,
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

export function isAppNavPathActive(pathname: string, path: AppNavPath) {
  if (path === '/app/sales') {
    return (
      pathname === path ||
      (pathname.startsWith('/app/sales/') &&
        !pathname.startsWith('/app/sales/documents'))
    )
  }

  if (path === '/app/sales/documents') {
    return pathname === path || pathname.startsWith(`${path}/`)
  }

  if (path === '/app/purchases') {
    return pathname === path || pathname.startsWith('/app/purchases/')
  }

  return pathname === path || pathname.startsWith(`${path}/`)
}
