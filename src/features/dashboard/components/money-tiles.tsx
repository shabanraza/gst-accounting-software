import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

import { Badge } from '#/components/ui/badge.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { CountUpNumber } from '#/components/ui/count-up.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { moneyTone } from '#/features/dashboard/money-tone.ts'
import { computeNetPosition } from '#/features/dashboard/net-position.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { cn } from '#/lib/utils.ts'

import type { OwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'
import type { MonthFigure } from '#/features/dashboard/dashboard-view.ts'

type Tile = {
  key: string
  label: string
  value: string
  toneClassName: string
  footer: ReactNode
  to: string
  search?: { tab: 'ageing' }
}

const footerClassName = 'truncate text-xs text-muted-foreground'

function TileCard({ tile }: { tile: Tile }) {
  return (
    <Link
      className="group/tile rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      search={tile.search}
      to={tile.to}
    >
      <Card className="h-full transition-shadow duration-(--duration-fast) group-hover/tile:shadow-(--elevation-2)">
        <CardContent className="flex min-w-0 flex-col gap-1.5">
          <span className="truncate text-xs font-medium text-muted-foreground">
            {tile.label}
          </span>
          <span
            className={cn(
              'truncate text-xl font-semibold tabular-nums sm:text-2xl',
              moneyTone(tile.value, tile.toneClassName),
            )}
          >
            <CountUpNumber format={formatInr} value={Number(tile.value)} />
          </span>
          {tile.footer}
        </CardContent>
      </Card>
    </Link>
  )
}

/**
 * The four numbers an owner checks first: what they sold, what they are owed,
 * what they owe and what they hold. Each opens the screen behind it.
 */
export function MoneyTiles({
  snapshot,
  sales,
}: {
  snapshot: OwnerDashboardSnapshot | undefined
  sales: MonthFigure | undefined
}) {
  if (!snapshot) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const { balances } = snapshot
  const overdue = Number(balances.receivableOverdue)
  const dueSoon = Number(balances.payableDueThisWeek)

  const tiles: Array<Tile> = [
    {
      key: 'sales',
      label: 'Sales this month',
      value: snapshot.monthCompare.current.salesTotal,
      toneClassName: 'text-foreground',
      to: '/app/sales',
      footer: sales?.change ? (
        <span className="flex min-w-0 items-center gap-1.5">
          <Badge
            variant={
              sales.change.direction === 'up' ? 'success' : 'destructive'
            }
          >
            {sales.change.label}
          </Badge>
          <span className={footerClassName}>vs last month</span>
        </span>
      ) : (
        <span className={footerClassName}>
          {snapshot.monthCompare.currentLabel}
        </span>
      ),
    },
    {
      key: 'receivable',
      label: 'To collect',
      value: balances.receivableTotal,
      toneClassName: 'text-money-in',
      to: '/app/reports',
      search: { tab: 'ageing' },
      footer:
        overdue > 0 ? (
          <span className="truncate text-xs font-medium text-destructive">
            {formatInr(overdue)} overdue
          </span>
        ) : (
          <span className={footerClassName}>Nothing overdue</span>
        ),
    },
    {
      key: 'payable',
      label: 'To pay',
      value: balances.payableTotal,
      toneClassName: 'text-money-out',
      to: '/app/reports',
      search: { tab: 'ageing' },
      footer:
        dueSoon > 0 ? (
          <span className="truncate text-xs font-medium text-warning">
            {formatInr(dueSoon)} due within 7 days
          </span>
        ) : (
          <span className={footerClassName}>Nothing due this week</span>
        ),
    },
    {
      key: 'cash',
      label: 'Cash and bank',
      value: balances.cashBankBalance,
      toneClassName: 'text-foreground',
      to: '/app/reports',
      footer: (
        <span className={footerClassName}>
          Net position {formatInr(computeNetPosition(balances))}
        </span>
      ),
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {tiles.map((tile) => (
        <TileCard key={tile.key} tile={tile} />
      ))}
    </div>
  )
}
