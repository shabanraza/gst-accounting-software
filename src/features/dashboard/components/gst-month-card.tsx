import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { moneyTone } from '#/features/dashboard/money-tone.ts'
import { formatShortDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { monthlyGstFilingDates } from '#/lib/gst-period.ts'
import { cn } from '#/lib/utils.ts'

import type { OwnerDashboardSnapshot } from '#/features/dashboard/dashboard-owner-service.ts'

function GstLine({
  label,
  value,
  strong = false,
}: {
  label: string
  value: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span
        className={cn(
          'text-muted-foreground',
          strong && 'text-foreground font-medium',
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          'tabular-nums',
          strong
            ? cn('text-base font-semibold', moneyTone(value, 'text-gst'))
            : 'text-foreground',
        )}
      >
        {formatInr(value)}
      </span>
    </div>
  )
}

/** This month's GST position from posted documents, with the filing dates ahead. */
export function GstMonthCard({
  asOfDate,
  gst,
}: {
  asOfDate: string
  gst: OwnerDashboardSnapshot['gstMtd'] | undefined
}) {
  const due = monthlyGstFilingDates(asOfDate)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">GST this month</CardTitle>
        <CardDescription>
          Monthly filers: GSTR-1 by {formatShortDate(due.gstr1)}, GSTR-3B by{' '}
          {formatShortDate(due.gstr3b)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm">
        {gst ? (
          <>
            <GstLine label="Output GST" value={gst.outputGst} />
            <GstLine label="Input tax credit" value={gst.inputGst} />
            <div className="border-t border-border/60 pt-2">
              <GstLine label="Net payable" strong value={gst.netGstPayable} />
            </div>
          </>
        ) : (
          Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-4 w-full" key={index} />
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" variant="outline">
          <Link search={{ tab: 'gstr3b' }} to="/app/reports">
            GSTR-3B summary
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
