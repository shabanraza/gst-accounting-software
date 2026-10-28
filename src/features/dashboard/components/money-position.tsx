import { BanknoteIcon } from 'lucide-react'
import type { CSSProperties } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { CountUpNumber } from '#/components/ui/count-up.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { formatInr } from '#/lib/format-inr.ts'
import { moneyTone } from '#/features/dashboard/money-tone.ts'
import { cn } from '#/lib/utils.ts'

type MoneyValue = number | string

type PositionEntry = {
  key: string
  label: string
  toneClassName: string
  value: number
}

function toNumber(value: MoneyValue) {
  const amount = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(amount) ? amount : 0
}

const labelClassName =
  'text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground'

function PositionCell({
  className,
  emphasis = false,
  entry,
  multilineLabel = false,
}: {
  className?: string
  emphasis?: boolean
  entry: PositionEntry
  multilineLabel?: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-col gap-1',
        // Equal-height grid cells + mt-auto on the amount keeps values aligned
        // when a label wraps (e.g. 375px three-up) without a brittle min-h.
        multilineLabel && 'h-full',
        className,
      )}
    >
      <span
        className={cn(
          labelClassName,
          multilineLabel ? 'line-clamp-2' : 'truncate',
        )}
      >
        {entry.label}
      </span>
      <span
        className={cn(
          'truncate tabular-nums',
          multilineLabel && 'mt-auto',
          emphasis
            ? 'text-base font-semibold text-foreground'
            : 'text-xs font-medium sm:text-sm',
          moneyTone(entry.value, entry.toneClassName),
        )}
      >
        {formatInr(entry.value)}
      </span>
    </div>
  )
}

function SkeletonCell({ className }: { className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Skeleton className="h-2.5 w-20" />
      <Skeleton className="h-4 w-24" />
    </div>
  )
}

/** Vertical hairlines only once the four cells share a single row. */
const stripCellClassName =
  'sm:border-l sm:border-border/60 sm:pl-4 sm:first:border-l-0 sm:first:pl-0'

const stripGridClassName =
  'grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 sm:gap-x-0'

export type MoneyPositionProps = {
  cashBank: MoneyValue
  className?: string
  isLoading?: boolean
  netPosition: MoneyValue
  payable: MoneyValue
  receivable: MoneyValue
  variant?: 'strip' | 'focal'
}

/**
 * The four standing balances. `strip` is quiet reference material that sits
 * under a busy attention queue; `focal` promotes the same numbers onto a hero
 * card for when there is nothing else to look at.
 */
export function MoneyPosition({
  cashBank,
  className,
  isLoading = false,
  netPosition,
  payable,
  receivable,
  variant = 'strip',
}: MoneyPositionProps) {
  const entries: Array<PositionEntry> = [
    {
      key: 'cash-bank',
      label: 'Cash & bank',
      toneClassName: 'text-foreground',
      value: toNumber(cashBank),
    },
    {
      key: 'receivable',
      label: 'Customers owe you',
      toneClassName: 'text-money-in',
      value: toNumber(receivable),
    },
    {
      key: 'payable',
      label: 'You owe suppliers',
      toneClassName: 'text-money-out',
      value: toNumber(payable),
    },
    {
      key: 'net-position',
      label: 'Net position',
      toneClassName: 'text-foreground',
      value: toNumber(netPosition),
    },
  ]

  if (variant === 'focal') {
    const [cash, ...rest] = entries

    if (isLoading) {
      return (
        <Card className={cn('gap-4', className)} size="hero">
          <CardHeader>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-8 w-48" />
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
            {rest.map((entry) => (
              <SkeletonCell key={entry.key} />
            ))}
          </CardContent>
        </Card>
      )
    }

    return (
      <Card className={cn('gap-4', className)} size="hero">
        <CardHeader>
          <CardDescription className="flex items-center gap-2">
            <span
              className="icon-duotone grid size-6 shrink-0 place-items-center rounded-full bg-[color-mix(in_oklch,var(--icon-tone)_16%,transparent)]"
              style={{ '--icon-tone': 'var(--banking)' } as CSSProperties}
            >
              <BanknoteIcon className="size-3.5" />
            </span>
            {cash.label}
          </CardDescription>
          <CardTitle className="truncate text-2xl tabular-nums sm:text-3xl">
            <CountUpNumber format={formatInr} value={cash.value} />
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-3 border-t border-border/60 pt-4">
          {rest.map((entry) => (
            <PositionCell entry={entry} key={entry.key} multilineLabel />
          ))}
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          stripGridClassName,
          'border-b border-border pb-4',
          className,
        )}
      >
        {entries.map((entry) => (
          <SkeletonCell className={stripCellClassName} key={entry.key} />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        stripGridClassName,
        'border-b border-border pb-4',
        className,
      )}
    >
      {entries.map((entry, index) => (
        <PositionCell
          className={stripCellClassName}
          emphasis={index === 0}
          entry={entry}
          key={entry.key}
        />
      ))}
    </div>
  )
}
