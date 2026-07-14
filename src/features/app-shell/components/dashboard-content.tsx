import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  BanknoteIcon,
  ClockIcon,
  IndianRupeeIcon,
  PackageIcon,
  ShoppingCartIcon,
  TruckIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function DashboardContent() {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()
  const summaryDate = new Date().toISOString().slice(0, 10)

  const summaryQuery = useQuery({
    ...trpc.dashboard.getSummary.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      summaryDate,
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const salesQuery = useQuery({
    ...trpc.sales.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const purchasesQuery = useQuery({
    ...trpc.purchases.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const stockQuery = useQuery({
    ...trpc.inventory.listStockBalances.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const isPageLoading =
    summaryQuery.isPending ||
    salesQuery.isPending ||
    purchasesQuery.isPending ||
    stockQuery.isPending ||
    itemsQuery.isPending

  const qtyByItem = new Map<string, number>()
  for (const balance of stockQuery.data ?? []) {
    qtyByItem.set(
      balance.itemId,
      (qtyByItem.get(balance.itemId) ?? 0) + Number(balance.quantity),
    )
  }
  const lowStockItems = (itemsQuery.data ?? [])
    .filter((item) => item.tracksInventory && Number(item.reorderLevel) > 0)
    .map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.baseUnit,
      quantity: qtyByItem.get(item.id) ?? 0,
      reorderLevel: Number(item.reorderLevel),
    }))
    .filter((item) => item.quantity <= item.reorderLevel)
    .sort((left, right) => left.quantity - right.quantity)

  const overdueCutoff = new Date()
  overdueCutoff.setDate(overdueCutoff.getDate() - 30)
  const overdueCutoffDate = overdueCutoff.toISOString().slice(0, 10)
  const overdueInvoices = (salesQuery.data ?? [])
    .filter(
      (row) =>
        Number(row.outstandingAmount) > 0 &&
        row.status !== 'cancelled' &&
        row.invoiceDate < overdueCutoffDate,
    )
    .sort((left, right) => left.invoiceDate.localeCompare(right.invoiceDate))

  const salesTotal = (salesQuery.data ?? []).reduce(
    (sum, row) => sum + Number(row.totalAmount),
    0,
  )
  const purchaseTotal = (purchasesQuery.data ?? []).reduce(
    (sum, row) => sum + Number(row.totalAmount),
    0,
  )
  const receivable = (salesQuery.data ?? []).reduce(
    (sum, row) => sum + Number(row.outstandingAmount),
    0,
  )
  const payable = (purchasesQuery.data ?? []).reduce(
    (sum, row) => sum + Number(row.outstandingAmount),
    0,
  )
  const stockLines = stockQuery.data?.length ?? 0

  const cards = [
    {
      label: 'Sales this period',
      value: formatInr(salesTotal),
      icon: ShoppingCartIcon,
    },
    {
      label: 'Purchases this period',
      value: formatInr(purchaseTotal),
      icon: TruckIcon,
    },
    {
      label: 'Customers owe you',
      value: formatInr(receivable),
      icon: IndianRupeeIcon,
    },
    {
      label: 'You owe suppliers',
      value: formatInr(payable),
      icon: IndianRupeeIcon,
    },
  ]

  const quickActions = [
    {
      label: 'New sales bill',
      to: '/app/sales/new' as const,
      icon: ShoppingCartIcon,
      variant: 'default' as const,
    },
    {
      label: 'New purchase bill',
      to: '/app/purchases/new' as const,
      icon: TruckIcon,
      variant: 'secondary' as const,
    },
    {
      label: 'Record payment',
      to: '/app/payments' as const,
      icon: BanknoteIcon,
      variant: 'outline' as const,
    },
  ]

  return (
    <WorkspacePage
      description="Today's business at a glance"
      title="Dashboard"
    >
      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Button key={action.to} asChild size="sm" variant={action.variant}>
              <Link to={action.to}>
                <Icon data-icon="inline-start" />
                {action.label}
              </Link>
            </Button>
          )
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {isPageLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Skeleton className="h-24 w-full" key={index} />
            ))
          : cards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.label}>
              <CardHeader className="pb-2">
                <CardDescription className="flex items-center gap-2">
                  <Icon className="size-3.5" />
                  {card.label}
                </CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {card.value}
                </CardTitle>
              </CardHeader>
            </Card>
          )
        })}
      </div>

      {lowStockItems.length > 0 || overdueInvoices.length > 0 ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {lowStockItems.length > 0 ? (
            <Card className="border-warning/30 bg-warning-foreground/40">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangleIcon className="size-4 text-warning" />
                  Low stock ({lowStockItems.length})
                </CardTitle>
                <CardDescription>
                  Items at or below their reorder level.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                {lowStockItems.slice(0, 5).map((item) => (
                  <div className="flex justify-between gap-3" key={item.id}>
                    <span className="truncate">{item.name}</span>
                    <span className="shrink-0 tabular-nums text-inventory">
                      {item.quantity} / {item.reorderLevel} {item.unit}
                    </span>
                  </div>
                ))}
                <Button asChild className="mt-1 self-start" size="sm" variant="outline">
                  <Link to="/app/inventory">Review inventory</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {overdueInvoices.length > 0 ? (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClockIcon className="size-4 text-destructive" />
                  Overdue receivables ({overdueInvoices.length})
                </CardTitle>
                <CardDescription>
                  Unpaid invoices older than 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                {overdueInvoices.slice(0, 5).map((row) => (
                  <div className="flex justify-between gap-3" key={row.id}>
                    <span className="truncate">
                      {row.invoiceNumber} · {row.invoiceDate}
                    </span>
                    <span className="shrink-0 tabular-nums text-destructive">
                      {formatInr(row.outstandingAmount)}
                    </span>
                  </div>
                ))}
                <Button asChild className="mt-1 self-start" size="sm" variant="outline">
                  <Link to="/app/sales">Chase payments</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily summary cache</CardTitle>
            <CardDescription>{summaryDate}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Sales total</span>
              <span className="text-money-in">{formatInr(summaryQuery.data?.salesTotal ?? 0)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Purchase total</span>
              <span className="text-money-out">{formatInr(summaryQuery.data?.purchaseTotal ?? 0)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Customers owe you</span>
              <span className="text-money-in">
                {formatInr(summaryQuery.data?.receivableTotal ?? 0)}
              </span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">You owe suppliers</span>
              <span className="text-money-out">{formatInr(summaryQuery.data?.payableTotal ?? 0)}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackageIcon className="size-4 text-muted-foreground" />
              Stock snapshot
            </CardTitle>
            <CardDescription>
              {stockLines} stock balance lines from movements
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Open Inventory for godown-wise qty, value, and low-stock status.
          </CardContent>
        </Card>
      </div>
    </WorkspacePage>
  )
}
