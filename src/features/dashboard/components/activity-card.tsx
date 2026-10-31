import { Link } from '@tanstack/react-router'
import { CalendarClockIcon, ReceiptIcon } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import {
  collapseRangeLabel,
  isQuietDay,
} from '#/features/dashboard/dashboard-view.ts'
import { moneyTone } from '#/features/dashboard/money-tone.ts'
import { formatShortDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { cn } from '#/lib/utils.ts'

import type { OwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'
import type {
  MonthCompareView,
  MonthFigure,
} from '#/features/dashboard/dashboard-view.ts'

type Figure = {
  label: string
  value: string
  toneClassName: string
  change?: MonthFigure['change']
  /** Only sales gets a good/bad verdict on its change. */
  judged?: boolean
}

function FigureGrid({ figures }: { figures: Array<Figure> }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {figures.map((figure) => (
        <div
          className="flex min-w-0 flex-col items-start gap-1"
          key={figure.label}
        >
          <span className="truncate text-xs text-muted-foreground">
            {figure.label}
          </span>
          <span
            className={cn(
              'truncate text-base font-semibold tabular-nums',
              moneyTone(figure.value, figure.toneClassName),
            )}
          >
            {formatInr(figure.value)}
          </span>
          {figure.change ? (
            <Badge
              variant={
                !figure.judged
                  ? 'secondary'
                  : figure.change.direction === 'up'
                    ? 'success'
                    : 'destructive'
              }
            >
              {figure.change.label}
            </Badge>
          ) : null}
        </div>
      ))}
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

const MONTH_TONE: Record<MonthFigure['key'], string> = {
  sales: 'text-money-in',
  purchases: 'text-money-out',
  expenses: 'text-money-out',
}

/** The selected day and the month to date, one tab each. */
export function ActivityCard({
  isToday,
  monthView,
  selectedDate,
  snapshot,
}: {
  isToday: boolean
  monthView: MonthCompareView | null
  selectedDate: string
  snapshot: OwnerDashboardSnapshot | undefined
}) {
  const [period, setPeriod] = useState<'day' | 'month'>('day')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Activity</CardTitle>
        <Tabs
          onValueChange={(value) => setPeriod(value as 'day' | 'month')}
          value={period}
        >
          <TabsList>
            <TabsTrigger value="day">
              {isToday ? 'Today' : formatShortDate(selectedDate)}
            </TabsTrigger>
            <TabsTrigger value="month">This month</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        {!snapshot || !monthView ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div className="flex flex-col gap-1.5" key={index}>
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        ) : period === 'month' ? (
          <>
            <FigureGrid
              figures={monthView.figures.map((figure) => ({
                label: figure.label,
                value: figure.value,
                toneClassName: MONTH_TONE[figure.key],
                change: figure.change,
                judged: figure.key === 'sales',
              }))}
            />
            {monthView.caption ? (
              <span className="text-xs text-muted-foreground">
                {monthView.caption}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {collapseRangeLabel(snapshot.monthCompare.currentLabel)}
              </span>
            )}
          </>
        ) : isQuietDay(snapshot) ? (
          <span className="py-4 text-center text-muted-foreground">
            {isToday
              ? 'Nothing recorded today'
              : 'Nothing recorded on this day'}
          </span>
        ) : (
          <>
            <FigureGrid
              figures={[
                {
                  label: 'Sales',
                  value: snapshot.today.salesTotal,
                  toneClassName: 'text-money-in',
                },
                {
                  label: 'Purchases',
                  value: snapshot.today.purchaseTotal,
                  toneClassName: 'text-money-out',
                },
                {
                  label: 'Net cash flow',
                  value: snapshot.today.netCashFlow,
                  toneClassName:
                    Number(snapshot.today.netCashFlow) < 0
                      ? 'text-money-out'
                      : 'text-money-in',
                },
              ]}
            />

            {snapshot.dueToday.receivables.length > 0 ||
            snapshot.dueToday.payables.length > 0 ? (
              <section className="flex min-w-0 flex-col gap-2 border-t border-border/60 pt-3">
                <h3 className="flex items-center gap-2 text-xs font-medium">
                  <CalendarClockIcon className="size-3.5 text-muted-foreground" />
                  Falls due
                </h3>
                {snapshot.dueToday.receivables.slice(0, 4).map((row) => (
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
              <section className="flex min-w-0 flex-col gap-2 border-t border-border/60 pt-3">
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
                  className="self-start"
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
  )
}
