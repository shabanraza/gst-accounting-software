import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  CalendarClockIcon,
  CircleCheckBigIcon,
  FilePlusIcon,
  ReceiptIcon,
  TrendingUpIcon,
} from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'

import { Button } from '#/components/ui/button.tsx'
import { cn } from '#/lib/utils.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Badge } from '#/components/ui/badge.tsx'
import {
  AGEING_BUCKET_DISPLAY_LABEL,
  AGEING_BUCKET_ORDER,
} from '#/features/accounting/ageing-service.ts'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/lib/format-inr.ts'
import { AttentionQueueCard } from '#/features/dashboard/components/attention-queue-card.tsx'
import { MoneyPosition } from '#/features/dashboard/components/money-position.tsx'
import {
  buildMonthCompareView,
  collapseRangeLabel,
  hasTrendActivity,
  isFirstRun,
  isQuietDay,
} from '#/features/dashboard/dashboard-view.ts'
import { moneyTone } from '#/features/dashboard/money-tone.ts'
import { computeNetPosition } from '#/features/dashboard/net-position.ts'
import { formatShortDate, localCalendarDate } from '#/lib/calendar-date.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { BadgeIntent } from '#/lib/badge-intent.ts'
import type {
  MonthFigure,
  MonthFigureKey,
} from '#/features/dashboard/dashboard-view.ts'

// Recharts loads after the dashboard figures, not before them.
const TrendChart = lazy(() =>
  import('#/features/dashboard/components/dashboard-charts.tsx').then(
    (module) => ({ default: module.TrendChart }),
  ),
)
const AgeingChart = lazy(() =>
  import('#/features/dashboard/components/dashboard-charts.tsx').then(
    (module) => ({ default: module.AgeingChart }),
  ),
)

const MONTH_FIGURE_TONE: Record<MonthFigureKey, string> = {
  sales: 'text-money-in',
  purchases: 'text-money-out',
  expenses: 'text-money-out',
}

function formatDayHeading(date: string) {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Only sales gets a verdict. Purchases and expenses tracking sales upwards is
 * not a failure, so their badges stay neutral and carry the number alone.
 */
function changeIntent(figure: MonthFigure): BadgeIntent {
  if (figure.key !== 'sales') return 'secondary'
  return figure.change?.direction === 'up' ? 'success' : 'destructive'
}

/** Staggered first-paint reveal for the hero blocks only — dense
 * screens must never use this. Capped so the whole strip settles quickly. */
function revealStyle(index: number) {
  return { animationDelay: `${Math.min(index, 5) * 40}ms` }
}

const revealClassName =
  'animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-(--duration-spring) ease-(--ease-spring)'

const figureLabelClassName =
  'text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground'

function DayFigure({
  label,
  toneClassName,
  value,
}: {
  label: string
  toneClassName: string
  value: string
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className={cn(figureLabelClassName, 'truncate')}>{label}</span>
      <span
        className={cn(
          'truncate text-sm font-medium tabular-nums',
          moneyTone(value, toneClassName),
        )}
      >
        {formatInr(value)}
      </span>
    </div>
  )
}

function DayFigureSkeleton() {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Skeleton className="h-2.5 w-16" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

function DocumentRow({
  amount,
  label,
  toneClassName,
}: {
  amount: string
  label: string
  toneClassName: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="truncate">{label}</span>
      <span className={cn('shrink-0 tabular-nums', toneClassName)}>
        {formatInr(amount)}
      </span>
    </div>
  )
}

/** Hero-surface empty state: duotone mark, one sentence, one way forward. */
function EmptyBlock({
  action,
  className,
  icon: Icon,
  message,
  tone,
}: {
  action?: ReactNode
  className?: string
  icon: typeof ReceiptIcon
  message: string
  tone: string
}) {
  return (
    <div
      className={cn(
        'flex flex-1 flex-col items-center justify-center gap-3 py-6 text-center',
        className,
      )}
    >
      <span
        className="icon-duotone grid size-10 place-items-center rounded-full bg-[color-mix(in_oklch,var(--icon-tone)_16%,transparent)]"
        style={{ '--icon-tone': tone } as CSSProperties}
      >
        <Icon className="size-5" />
      </span>
      <span className="text-sm font-medium">{message}</span>
      {action}
    </div>
  )
}

export function DashboardContent() {
  const trpc = useTRPC()
  const { capabilities, companyId, company, isReady } = useWorkspace()
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

  /**
   * `snapshot` is absent while the query is pending and also when it fails, and
   * neither case may be dressed up as real data — an empty attention queue in
   * particular would read as "nothing needs you" when nothing was fetched.
   */
  const snapshot = snapshotQuery.data
  const ageing = snapshot?.ageing
  const gstMtd = snapshot?.gstMtd

  /**
   * The snapshot withholds ageing and GST from callers without `view_reports`.
   * Reading the same capability from the workspace — which is already resolved
   * before this query is enabled — lets the report blocks be absent from the
   * first paint instead of appearing as skeletons and then vanishing.
   */
  const canViewReports = capabilities.includes('view_reports')
  const showGst = canViewReports && (!snapshot || Boolean(gstMtd))
  const showAgeing = canViewReports && (!snapshot || Boolean(ageing))
  const canPostSales = capabilities.includes('post_sales')

  /** An empty queue leaves nothing else to look at, so the position leads. */
  const moneyVariant =
    snapshot && snapshot.attention.length === 0 ? 'focal' : 'strip'

  const monthCompare = snapshot?.monthCompare
  const monthView = monthCompare ? buildMonthCompareView(monthCompare) : null
  const quietDay = snapshot ? isQuietDay(snapshot) : false

  const newInvoiceAction = canPostSales ? (
    <Button asChild size="sm">
      <Link to="/app/sales/new">New sales invoice</Link>
    </Button>
  ) : undefined

  /**
   * A company with nothing on its books would otherwise stack five separate
   * empty states down the page, so it gets one card and the first moves
   * instead. The standing balances stay: their zeros are real figures.
   */
  const firstRun = snapshot ? isFirstRun(snapshot) : false

  const firstRunActions = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {newInvoiceAction}
      <Button asChild size="sm" variant="outline">
        <Link to="/app/masters/parties">Add a party</Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <Link to="/app/masters/items">Add an item</Link>
      </Button>
    </div>
  )

  const receivableAgeingData = ageing
    ? AGEING_BUCKET_ORDER.map((bucket) => ({
        bucket: AGEING_BUCKET_DISPLAY_LABEL[bucket],
        bucketKey: bucket,
        amount: Number(ageing.receivables[bucket]),
      }))
    : []

  const payableAgeingData = ageing
    ? AGEING_BUCKET_ORDER.map((bucket) => ({
        bucket: AGEING_BUCKET_DISPLAY_LABEL[bucket],
        bucketKey: bucket,
        amount: Number(ageing.payables[bucket]),
      }))
    : []

  const hasReceivableAgeing = receivableAgeingData.some(
    (row) => row.amount !== 0,
  )
  const hasPayableAgeing = payableAgeingData.some((row) => row.amount !== 0)

  return (
    <WorkspacePage
      actions={
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
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
            className="w-full min-w-0 sm:w-auto sm:min-w-32"
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
      <div
        className={cn('flex flex-col gap-2', revealClassName)}
        style={revealStyle(0)}
      >
        {!isToday ? (
          <span className={figureLabelClassName}>Live balances, as of now</span>
        ) : null}
        <MoneyPosition
          cashBank={snapshot?.balances.cashBankBalance ?? '0'}
          isLoading={!snapshot}
          netPosition={snapshot ? computeNetPosition(snapshot.balances) : '0'}
          payable={snapshot?.balances.payableTotal ?? '0'}
          receivable={snapshot?.balances.receivableTotal ?? '0'}
          variant={moneyVariant}
        />
      </div>

      {firstRun ? (
        <div className={revealClassName} style={revealStyle(1)}>
          <Card size="hero">
            <CardContent>
              <EmptyBlock
                action={firstRunActions}
                icon={FilePlusIcon}
                message="Nothing recorded yet"
                tone="var(--money-in)"
              />
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          <div className={revealClassName} style={revealStyle(1)}>
            <AttentionQueueCard
              isLoading={!snapshot}
              items={snapshot?.attention ?? []}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  {isToday ? 'Today' : 'On this day'}
                </CardTitle>
                <CardDescription>
                  {formatDayHeading(selectedDate)}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {!snapshot ? (
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <DayFigureSkeleton key={index} />
                    ))}
                  </div>
                ) : quietDay ? (
                  <EmptyBlock
                    action={newInvoiceAction}
                    icon={FilePlusIcon}
                    message={
                      isToday
                        ? 'Nothing recorded today'
                        : 'Nothing recorded on this day'
                    }
                    tone="var(--money-in)"
                  />
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-3">
                      <DayFigure
                        label="Sales"
                        toneClassName="text-money-in"
                        value={snapshot.today.salesTotal}
                      />
                      <DayFigure
                        label="Purchases"
                        toneClassName="text-money-out"
                        value={snapshot.today.purchaseTotal}
                      />
                      <DayFigure
                        label="Net cash flow"
                        toneClassName={
                          Number(snapshot.today.netCashFlow) < 0
                            ? 'text-money-out'
                            : 'text-money-in'
                        }
                        value={snapshot.today.netCashFlow}
                      />
                    </div>

                    {snapshot.dueToday.receivables.length > 0 ||
                    snapshot.dueToday.payables.length > 0 ? (
                      <section className="flex min-w-0 flex-col gap-2 border-t border-border/60 pt-3 text-sm">
                        <h3 className="flex items-center gap-2 text-xs font-medium">
                          <CalendarClockIcon className="size-3.5 text-muted-foreground" />
                          Falls due
                        </h3>
                        {snapshot.dueToday.receivables
                          .slice(0, 4)
                          .map((row) => (
                            <DocumentRow
                              amount={row.amount}
                              key={row.id}
                              label={`Collect from ${row.partyName} · ${row.documentNumber}`}
                              toneClassName="text-money-in"
                            />
                          ))}
                        {snapshot.dueToday.payables.slice(0, 4).map((row) => (
                          <DocumentRow
                            amount={row.amount}
                            key={row.id}
                            label={`Pay ${row.partyName} · ${row.documentNumber}`}
                            toneClassName="text-money-out"
                          />
                        ))}
                      </section>
                    ) : null}

                    {snapshot.todayExpenses.length > 0 ? (
                      <section className="flex min-w-0 flex-col gap-2 border-t border-border/60 pt-3 text-sm">
                        <h3 className="flex items-center gap-2 text-xs font-medium">
                          <ReceiptIcon className="size-3.5 text-muted-foreground" />
                          Expenses
                        </h3>
                        {snapshot.todayExpenses.slice(0, 4).map((expense) => (
                          <DocumentRow
                            amount={expense.amount}
                            key={expense.id}
                            label={expense.narration}
                            toneClassName="text-money-out"
                          />
                        ))}
                        <Button
                          asChild
                          className="mt-1 self-start"
                          size="sm"
                          variant="outline"
                        >
                          <Link to="/app/expenses">All expenses</Link>
                        </Button>
                      </section>
                    ) : null}
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">This month so far</CardTitle>
                <CardDescription>
                  {monthCompare
                    ? collapseRangeLabel(monthCompare.currentLabel)
                    : 'Month to date'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4">
                {!monthView ? (
                  <div className="grid grid-cols-3 gap-3">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <DayFigureSkeleton key={index} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="grid grid-cols-3 gap-3">
                      {monthView.figures.map((figure) => (
                        <div
                          className="flex min-w-0 flex-col items-start gap-1"
                          key={figure.key}
                        >
                          <span
                            className={cn(figureLabelClassName, 'truncate')}
                          >
                            {figure.label}
                          </span>
                          <span
                            className={cn(
                              'truncate text-sm font-medium tabular-nums',
                              moneyTone(
                                figure.value,
                                MONTH_FIGURE_TONE[figure.key],
                              ),
                            )}
                          >
                            {formatInr(figure.value)}
                          </span>
                          {figure.change ? (
                            <Badge variant={changeIntent(figure)}>
                              {figure.change.label}
                            </Badge>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    {monthView.caption ? (
                      <span className="text-xs text-muted-foreground">
                        {monthView.caption}
                      </span>
                    ) : null}
                  </div>
                )}

                {showGst ? (
                  <div className="mt-auto flex flex-wrap items-end justify-between gap-3 border-t border-border/60 pt-3">
                    {gstMtd ? (
                      <>
                        <div className="flex min-w-0 flex-col gap-1">
                          <span
                            className={cn(figureLabelClassName, 'truncate')}
                          >
                            GST net payable
                          </span>
                          <span
                            className={cn(
                              'truncate text-sm font-medium tabular-nums',
                              moneyTone(
                                gstMtd.netGstPayable,
                                Number(gstMtd.netGstPayable) > 0
                                  ? 'text-money-out'
                                  : 'text-money-in',
                              ),
                            )}
                          >
                            {formatInr(gstMtd.netGstPayable)}
                          </span>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <Link to="/app/reports">GST reports</Link>
                        </Button>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-1.5">
                          <Skeleton className="h-2.5 w-24" />
                          <Skeleton className="h-4 w-28" />
                        </div>
                        <Skeleton className="h-8 w-28" />
                      </>
                    )}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {isToday
                  ? 'Last 7 days'
                  : `7 days to ${formatShortDate(selectedDate)}`}
              </CardTitle>
              <CardDescription>Sales vs purchases</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {!snapshot ? (
                <Skeleton className="h-56 w-full" />
              ) : hasTrendActivity(snapshot.trend) ? (
                <Suspense fallback={<Skeleton className="h-56 w-full" />}>
                  <TrendChart data={snapshot.trend} />
                </Suspense>
              ) : (
                <EmptyBlock
                  action={newInvoiceAction}
                  className="h-56"
                  icon={TrendingUpIcon}
                  message="No sales or purchases in these 7 days"
                  tone="var(--money-in)"
                />
              )}
            </CardContent>
          </Card>

          {showAgeing ? (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Receivables ageing
                  </CardTitle>
                  <CardDescription>Outstanding by bucket</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  {!ageing ? (
                    <Skeleton className="h-48 w-full" />
                  ) : !hasReceivableAgeing ? (
                    <EmptyBlock
                      className="h-48"
                      icon={CircleCheckBigIcon}
                      message="Every invoice is settled"
                      tone="var(--money-in)"
                    />
                  ) : (
                    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                      <AgeingChart data={receivableAgeingData} />
                    </Suspense>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Payables ageing</CardTitle>
                  <CardDescription>Outstanding by bucket</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  {!ageing ? (
                    <Skeleton className="h-48 w-full" />
                  ) : !hasPayableAgeing ? (
                    <EmptyBlock
                      className="h-48"
                      icon={CircleCheckBigIcon}
                      message="No supplier bills outstanding"
                      tone="var(--money-in)"
                    />
                  ) : (
                    <Suspense fallback={<Skeleton className="h-48 w-full" />}>
                      <AgeingChart data={payableAgeingData} />
                    </Suspense>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      )}
    </WorkspacePage>
  )
}
