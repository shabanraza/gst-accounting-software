import { Link } from '@tanstack/react-router'
import { skipToken, useQuery } from '@tanstack/react-query'
import { TrendingUpIcon } from 'lucide-react'
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
import { QuickActionsBar } from '#/features/app-shell/components/quick-actions.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { ActivityCard } from '#/features/dashboard/components/activity-card.tsx'
import { AttentionQueueCard } from '#/features/dashboard/components/attention-queue-card.tsx'
import { GstMonthCard } from '#/features/dashboard/components/gst-month-card.tsx'
import { MoneyTiles } from '#/features/dashboard/components/money-tiles.tsx'
import { SetupChecklistCard } from '#/features/dashboard/components/setup-checklist-card.tsx'
import { TopDuesCard } from '#/features/dashboard/components/top-dues-card.tsx'
import {
  buildMonthCompareView,
  hasTrendActivity,
  isFirstRun,
} from '#/features/dashboard/dashboard-view.ts'
import { buildSetupChecklist } from '#/features/dashboard/setup-checklist.ts'
import { formatShortDate, localCalendarDate } from '#/lib/calendar-date.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

// Recharts loads after the dashboard figures, not before them.
const TrendChart = lazy(() =>
  import('#/features/dashboard/components/dashboard-charts.tsx').then(
    (module) => ({ default: module.TrendChart }),
  ),
)

function formatDayHeading(date: string) {
  const value = new Date(`${date}T12:00:00`)
  return value.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  })
}

/** Staggered first-paint reveal for the hero blocks only — dense
 * screens must never use this. Capped so the whole strip settles quickly. */
function revealStyle(index: number) {
  return { animationDelay: `${Math.min(index, 5) * 40}ms` }
}

const revealClassName =
  'animate-in fade-in-0 slide-in-from-bottom-2 fill-mode-both duration-(--duration-spring) ease-(--ease-spring)'

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
  icon: typeof TrendingUpIcon
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
  const snapshotQuery = useQuery(
    trpc.dashboard.getOwnerSnapshot.queryOptions(
      companyId && isReady
        ? {
            companyId,
            asOfDate: selectedDate,
            companyStateCode: company?.stateCode ?? '27',
          }
        : skipToken,
    ),
  )

  /**
   * `snapshot` is absent while the query is pending and also when it fails, and
   * neither case may be dressed up as real data — an empty attention queue in
   * particular would read as "nothing needs you" when nothing was fetched.
   */
  const snapshot = snapshotQuery.data

  /**
   * The snapshot withholds money, ageing and GST from callers without
   * `view_reports`. Reading the same capability from the workspace — already
   * resolved before this query is enabled — keeps those blocks out of the
   * first paint instead of showing zeros that are not real.
   */
  const canViewReports = capabilities.includes('view_reports')
  const canPostSales = capabilities.includes('post_sales')

  const monthView = snapshot
    ? buildMonthCompareView(snapshot.monthCompare)
    : null
  const salesFigure = monthView?.figures.find(
    (figure) => figure.key === 'sales',
  )

  const checklist =
    snapshot && company && capabilities.includes('manage_company')
      ? buildSetupChecklist({ company, setup: snapshot.setup })
      : null

  /**
   * A company with nothing on its books would otherwise stack empty cards
   * down the page, so it gets the setup checklist alone.
   */
  const firstRun = snapshot ? isFirstRun(snapshot) : false
  const onlyChecklist = Boolean(checklist?.show) && firstRun

  const newInvoiceAction = canPostSales ? (
    <Button asChild size="sm">
      <Link to="/app/sales/new">New sales invoice</Link>
    </Button>
  ) : undefined

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
      <div className={revealClassName} style={revealStyle(0)}>
        <QuickActionsBar capabilities={capabilities} />
      </div>

      {canViewReports ? (
        <div className={revealClassName} style={revealStyle(1)}>
          <MoneyTiles sales={salesFigure} snapshot={snapshot} />
        </div>
      ) : null}

      {checklist?.show ? (
        <div className={revealClassName} style={revealStyle(2)}>
          <SetupChecklistCard
            doneCount={checklist.doneCount}
            steps={checklist.steps}
          />
        </div>
      ) : null}

      {onlyChecklist ? null : (
        <div
          className={cn(
            'grid items-start gap-4',
            canViewReports && 'lg:grid-cols-3',
          )}
        >
          {/* Two independent columns, so a tall side column never leaves a
              gap under the to-do list. */}
          <div className="flex min-w-0 flex-col gap-4 lg:col-span-2">
            <AttentionQueueCard
              companyName={company?.tradeName ?? ''}
              isLoading={!snapshot}
              items={snapshot?.attention ?? []}
            />
            {canViewReports ? (
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
            ) : null}
          </div>
          {canViewReports ? (
            <div className="flex min-w-0 flex-col gap-4">
              <GstMonthCard asOfDate={selectedDate} gst={snapshot?.gstMtd} />
              <ActivityCard
                isToday={isToday}
                monthView={monthView}
                selectedDate={selectedDate}
                snapshot={snapshot}
              />
              <TopDuesCard
                payables={snapshot?.topPayables}
                receivables={snapshot?.topReceivables}
              />
            </div>
          ) : null}
        </div>
      )}
    </WorkspacePage>
  )
}
