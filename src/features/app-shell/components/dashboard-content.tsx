import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangleIcon,
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  BanknoteIcon,
  CalendarClockIcon,
  ClockIcon,
  FileChartColumnIncreasingIcon,
  IndianRupeeIcon,
  ReceiptIcon,
  ShoppingCartIcon,
  TruckIcon,
  WalletIcon,
} from 'lucide-react'
import { useState } from 'react'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '#/components/ui/chart.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { formatShortDate, localCalendarDate } from '#/lib/calendar-date.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

const trendChartConfig = {
  sales: {
    label: 'Sales',
    color: 'var(--chart-1)',
  },
  purchases: {
    label: 'Purchases',
    color: 'var(--chart-2)',
  },
}

const ageingChartConfig = {
  amount: {
    label: 'Outstanding',
    color: 'var(--chart-3)',
  },
}

function formatDayHeading(date: string) {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

function changeBadgeVariant(
  percent: string,
  positiveIsGood: boolean,
): 'success' | 'destructive' | 'secondary' {
  const value = Number(percent)
  if (value === 0) return 'secondary'
  const isUp = value > 0
  const isGood = positiveIsGood ? isUp : !isUp
  return isGood ? 'success' : 'destructive'
}

function formatChangeLabel(percent: string) {
  const value = Number(percent)
  if (value === 0) return 'Same as last month'
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${percent}% vs last month`
}

export function DashboardContent() {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()
  const todayDate = localCalendarDate()
  const [selectedDate, setSelectedDate] = useState(todayDate)
  const isToday = selectedDate === todayDate
  const companyInput = companyId ?? '00000000-0000-4000-8000-000000000099'
  const queryEnabled = Boolean(companyId) && isReady

  const snapshotQuery = useQuery({
    ...trpc.dashboard.getOwnerSnapshot.queryOptions({
      companyId: companyInput,
      asOfDate: selectedDate,
      companyStateCode: company?.stateCode ?? '27',
    }),
    enabled: queryEnabled,
  })
  const stockQuery = useQuery({
    ...trpc.inventory.listStockBalances.queryOptions({
      companyId: companyInput,
    }),
    enabled: queryEnabled,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyInput,
    }),
    enabled: queryEnabled,
  })

  const snapshot = snapshotQuery.data
  const isSnapshotLoading = snapshotQuery.isPending
  const isAlertsLoading = stockQuery.isPending || itemsQuery.isPending

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

  const overdueReceivableTotal =
    snapshot &&
    isToday &&
    Number(snapshot.ageing.receivables['31-60']) +
      Number(snapshot.ageing.receivables['61-90']) +
      Number(snapshot.ageing.receivables['90+'])

  const pulseCards = snapshot
    ? [
        {
          label: 'Sales',
          value: formatInr(snapshot.today.salesTotal),
          icon: ShoppingCartIcon,
          tone: 'text-money-in',
        },
        {
          label: 'Purchases',
          value: formatInr(snapshot.today.purchaseTotal),
          icon: TruckIcon,
          tone: 'text-money-out',
        },
        {
          label: 'Money in',
          value: formatInr(snapshot.today.moneyIn),
          icon: ArrowDownLeftIcon,
          tone: 'text-success',
        },
        {
          label: 'Money out',
          value: formatInr(snapshot.today.moneyOut),
          icon: ArrowUpRightIcon,
          tone: 'text-destructive',
        },
        {
          label: 'Expenses',
          value: formatInr(snapshot.today.expensesTotal),
          icon: ReceiptIcon,
          tone: 'text-money-out',
        },
        {
          label: 'Net cash flow',
          value: formatInr(snapshot.today.netCashFlow),
          icon: WalletIcon,
          tone:
            Number(snapshot.today.netCashFlow) >= 0
              ? 'text-success'
              : 'text-destructive',
        },
      ]
    : []

  const balanceCards = snapshot
    ? [
        {
          label: 'Cash & bank',
          value: formatInr(snapshot.balances.cashBankBalance),
          icon: BanknoteIcon,
        },
        {
          label: 'Customers owe you',
          value: formatInr(snapshot.balances.receivableTotal),
          icon: IndianRupeeIcon,
        },
        {
          label: 'You owe suppliers',
          value: formatInr(snapshot.balances.payableTotal),
          icon: IndianRupeeIcon,
        },
      ]
    : []

  const receivableAgeingData = snapshot
    ? (['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => ({
        bucket,
        amount: Number(snapshot.ageing.receivables[bucket]),
      }))
    : []

  const payableAgeingData = snapshot
    ? (['0-30', '31-60', '61-90', '90+'] as const).map((bucket) => ({
        bucket,
        amount: Number(snapshot.ageing.payables[bucket]),
      }))
    : []

  return (
    <WorkspacePage
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {!isToday ? (
            <Button
              onClick={() => setSelectedDate(todayDate)}
              size="default"
              variant="outline"
            >
              Today
            </Button>
          ) : null}
          <DatePicker
            align="end"
            className="min-w-32"
            max={todayDate}
            onChange={setSelectedDate}
            size="default"
            value={selectedDate}
            variant="toolbar"
          />
        </div>
      }
      description={formatDayHeading(selectedDate)}
      title="Dashboard"
    >
      {isSnapshotLoading ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-28 w-full" key={index} />
          ))}
        </div>
      ) : snapshot ? (
        <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Month sales</CardDescription>
              <CardTitle className="text-xl tabular-nums text-money-in">
                {formatInr(snapshot.monthCompare.current.salesTotal)}
              </CardTitle>
              <CardDescription>
                {snapshot.monthCompare.currentLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant={changeBadgeVariant(
                  snapshot.monthCompare.change.salesPercent,
                  true,
                )}
              >
                {formatChangeLabel(snapshot.monthCompare.change.salesPercent)}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                Last month: {formatInr(snapshot.monthCompare.previous.salesTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Month purchases</CardDescription>
              <CardTitle className="text-xl tabular-nums text-money-out">
                {formatInr(snapshot.monthCompare.current.purchaseTotal)}
              </CardTitle>
              <CardDescription>
                {snapshot.monthCompare.currentLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant={changeBadgeVariant(
                  snapshot.monthCompare.change.purchasePercent,
                  false,
                )}
              >
                {formatChangeLabel(snapshot.monthCompare.change.purchasePercent)}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                Last month:{' '}
                {formatInr(snapshot.monthCompare.previous.purchaseTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Month expenses</CardDescription>
              <CardTitle className="text-xl tabular-nums text-money-out">
                {formatInr(snapshot.monthCompare.current.expensesTotal)}
              </CardTitle>
              <CardDescription>
                {snapshot.monthCompare.currentLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Badge
                variant={changeBadgeVariant(
                  snapshot.monthCompare.change.expensesPercent,
                  false,
                )}
              >
                {formatChangeLabel(snapshot.monthCompare.change.expensesPercent)}
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                Last month:{' '}
                {formatInr(snapshot.monthCompare.previous.expensesTotal)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Compared period</CardDescription>
              <CardTitle className="text-base">Same days last month</CardTitle>
              <CardDescription>
                {snapshot.monthCompare.previousLabel}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Fair month-to-date comparison using the same number of calendar
              days.
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 xl:grid-cols-6">
        {isSnapshotLoading
          ? Array.from({ length: 6 }).map((_, index) => (
              <Skeleton className="h-24 w-full" key={index} />
            ))
          : pulseCards.map((card) => {
              const Icon = card.icon
              return (
                <Card key={card.label}>
                  <CardHeader className="pb-2">
                    <CardDescription className="flex items-center gap-2">
                      <Icon className="size-3.5" />
                      {card.label}
                    </CardDescription>
                    <CardTitle
                      className={`text-2xl tabular-nums ${card.tone}`}
                    >
                      {card.value}
                    </CardTitle>
                  </CardHeader>
                </Card>
              )
            })}
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        {isSnapshotLoading ? (
          <Skeleton className="h-72 w-full lg:col-span-2" />
        ) : snapshot ? (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">
                {isToday
                  ? 'Last 7 days'
                  : `7 days ending ${formatShortDate(selectedDate)}`}
              </CardTitle>
              <CardDescription>Sales vs purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer
                className="aspect-auto h-56 w-full"
                config={trendChartConfig}
              >
                <BarChart data={snapshot.trend}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    axisLine={false}
                    dataKey="date"
                    tickFormatter={formatShortDate}
                    tickLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value, name) => (
                          <span className="tabular-nums">
                            {name}: {formatInr(String(value))}
                          </span>
                        )}
                        labelFormatter={(value) => formatShortDate(String(value))}
                      />
                    }
                  />
                  <Bar
                    dataKey="sales"
                    fill="var(--color-sales)"
                    radius={4}
                  />
                  <Bar
                    dataKey="purchases"
                    fill="var(--color-purchases)"
                    radius={4}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        ) : null}

        {isSnapshotLoading ? (
          <Skeleton className="h-72 w-full" />
        ) : snapshot ? (
          <div className="flex flex-col gap-3">
            <Card className="border-gst/30 bg-gst-foreground/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileChartColumnIncreasingIcon className="size-4 text-gst" />
                  GST this month
                </CardTitle>
                <CardDescription>
                  {snapshot.gstMtd.periodStart} to {snapshot.gstMtd.periodEnd}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Taxable sales</span>
                  <span className="font-medium tabular-nums text-money-in">
                    {formatInr(snapshot.gstMtd.outwardTaxableValue)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Output GST</span>
                  <span className="font-medium tabular-nums text-gst">
                    {formatInr(snapshot.gstMtd.outputGst)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Input GST</span>
                  <span className="font-medium tabular-nums text-gst">
                    {formatInr(snapshot.gstMtd.inputGst)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Net payable</span>
                  <span className="font-medium tabular-nums text-money-out">
                    {formatInr(snapshot.gstMtd.netGstPayable)}
                  </span>
                </div>
                <Button asChild className="mt-1 w-full" size="sm" variant="outline">
                  <Link to="/app/reports">Open GST reports</Link>
                </Button>
              </CardContent>
            </Card>

            {isToday ? (
              balanceCards.map((card) => {
                const Icon = card.icon
                return (
                  <Card key={card.label}>
                    <CardHeader className="pb-2">
                      <CardDescription className="flex items-center gap-2">
                        <Icon className="size-3.5" />
                        {card.label}
                      </CardDescription>
                      <CardTitle className="text-xl tabular-nums">
                        {card.value}
                      </CardTitle>
                    </CardHeader>
                  </Card>
                )
              })
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Live balances</CardTitle>
                  <CardDescription>Current position as of now</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-2 text-sm">
                  {balanceCards.map((card) => (
                    <div className="flex justify-between gap-3" key={card.label}>
                      <span className="text-muted-foreground">{card.label}</span>
                      <span className="tabular-nums">{card.value}</span>
                    </div>
                  ))}
                  <Button
                    className="mt-1 self-start"
                    onClick={() => setSelectedDate(todayDate)}
                    size="sm"
                    variant="outline"
                  >
                    Jump to today
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClockIcon className="size-4 text-muted-foreground" />
              Due on this day
            </CardTitle>
            <CardDescription>{formatDayHeading(selectedDate)}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {isSnapshotLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : snapshot ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <p className="font-medium text-money-in">To collect</p>
                  {snapshot.dueToday.receivables.length === 0 ? (
                    <p className="text-muted-foreground">Nothing due this day.</p>
                  ) : (
                    snapshot.dueToday.receivables.slice(0, 5).map((row) => (
                      <div className="flex justify-between gap-3" key={row.id}>
                        <span className="truncate">
                          {row.partyName} · {row.documentNumber}
                        </span>
                        <span className="shrink-0 tabular-nums text-money-in">
                          {formatInr(row.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <p className="font-medium text-money-out">To pay</p>
                  {snapshot.dueToday.payables.length === 0 ? (
                    <p className="text-muted-foreground">Nothing due this day.</p>
                  ) : (
                    snapshot.dueToday.payables.slice(0, 5).map((row) => (
                      <div className="flex justify-between gap-3" key={row.id}>
                        <span className="truncate">
                          {row.partyName} · {row.documentNumber}
                        </span>
                        <span className="shrink-0 tabular-nums text-money-out">
                          {formatInr(row.amount)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptIcon className="size-4 text-muted-foreground" />
              Day expenses
            </CardTitle>
            <CardDescription>
              {snapshot
                ? formatInr(snapshot.today.expensesTotal)
                : 'Posted expenses'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-1.5 text-sm">
            {isSnapshotLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : snapshot && snapshot.todayExpenses.length > 0 ? (
              <>
                {snapshot.todayExpenses.slice(0, 6).map((expense) => (
                  <div className="flex justify-between gap-3" key={expense.id}>
                    <span className="truncate">{expense.narration}</span>
                    <span className="shrink-0 tabular-nums text-money-out">
                      {formatInr(expense.amount)}
                    </span>
                  </div>
                ))}
                <Button
                  asChild
                  className="mt-1 self-start"
                  size="sm"
                  variant="outline"
                >
                  <Link to="/app/expenses">All expenses</Link>
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">No expenses on this day.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {isToday ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receivables ageing</CardTitle>
              <CardDescription>Outstanding by bucket</CardDescription>
            </CardHeader>
            <CardContent>
              {isSnapshotLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ChartContainer
                  className="aspect-auto h-48 w-full"
                  config={ageingChartConfig}
                >
                  <BarChart
                    data={receivableAgeingData}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis hide type="number" />
                    <YAxis
                      axisLine={false}
                      dataKey="bucket"
                      tickLine={false}
                      type="category"
                      width={48}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatInr(String(value))}
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-amount)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payables ageing</CardTitle>
              <CardDescription>Outstanding by bucket</CardDescription>
            </CardHeader>
            <CardContent>
              {isSnapshotLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ChartContainer
                  className="aspect-auto h-48 w-full"
                  config={ageingChartConfig}
                >
                  <BarChart
                    data={payableAgeingData}
                    layout="vertical"
                    margin={{ left: 8 }}
                  >
                    <CartesianGrid horizontal={false} />
                    <XAxis hide type="number" />
                    <YAxis
                      axisLine={false}
                      dataKey="bucket"
                      tickLine={false}
                      type="category"
                      width={48}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => formatInr(String(value))}
                        />
                      }
                    />
                    <Bar
                      dataKey="amount"
                      fill="var(--color-amount)"
                      radius={4}
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {isToday &&
      (lowStockItems.length > 0 || (overdueReceivableTotal ?? 0) > 0) ? (
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
                <Button
                  asChild
                  className="mt-1 self-start"
                  size="sm"
                  variant="outline"
                >
                  <Link to="/app/inventory">Review inventory</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
          {(overdueReceivableTotal ?? 0) > 0 ? (
            <Card className="border-destructive/30">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClockIcon className="size-4 text-destructive" />
                  Overdue receivables
                </CardTitle>
                <CardDescription>
                  {formatInr(overdueReceivableTotal ?? 0)} past 30 days.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5 text-sm">
                <Button
                  asChild
                  className="self-start"
                  size="sm"
                  variant="outline"
                >
                  <Link to="/app/sales">Chase payments</Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : isAlertsLoading && isToday ? (
        <Skeleton className="h-32 w-full" />
      ) : null}
    </WorkspacePage>
  )
}
