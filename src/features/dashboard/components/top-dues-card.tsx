import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'
import { useState } from 'react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { Skeleton } from '#/components/ui/skeleton.tsx'
import { Tabs, TabsList, TabsTrigger } from '#/components/ui/tabs.tsx'
import { formatInr } from '#/lib/format-inr.ts'
import { cn } from '#/lib/utils.ts'

import type { PartyBalance } from '#/features/dashboard/dashboard-owner-service.ts'

type Side = 'receivable' | 'payable'

/** The largest party balances, owed to you or by you, with what is overdue. */
export function TopDuesCard({
  payables,
  receivables,
}: {
  payables: Array<PartyBalance> | undefined
  receivables: Array<PartyBalance> | undefined
}) {
  const [side, setSide] = useState<Side>('receivable')
  const rows = side === 'receivable' ? receivables : payables
  const isReceivable = side === 'receivable'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="text-base">Top dues</CardTitle>
        <Tabs onValueChange={(value) => setSide(value as Side)} value={side}>
          <TabsList>
            <TabsTrigger value="receivable">Customers</TabsTrigger>
            <TabsTrigger value="payable">Suppliers</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 text-sm">
        {!rows ? (
          Array.from({ length: 4 }).map((_, index) => (
            <Skeleton className="h-5 w-full" key={index} />
          ))
        ) : rows.length === 0 ? (
          <span className="py-4 text-center text-muted-foreground">
            {isReceivable
              ? 'No customer owes you anything'
              : 'You owe no supplier anything'}
          </span>
        ) : (
          rows.map((row) => (
            <Link
              className="-mx-2 flex min-w-0 items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50"
              key={row.partyId}
              search={{ party: row.partyId }}
              to={isReceivable ? '/app/sales' : '/app/purchases'}
            >
              <span className="min-w-0 flex-1 truncate">{row.partyName}</span>
              {Number(row.overdueAmount) > 0 ? (
                <Badge variant="destructive">
                  {formatInr(row.overdueAmount)} overdue
                </Badge>
              ) : null}
              <span
                className={cn(
                  'shrink-0 font-medium tabular-nums',
                  isReceivable ? 'text-money-in' : 'text-money-out',
                )}
              >
                {formatInr(row.outstandingAmount)}
              </span>
            </Link>
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button asChild size="sm" variant="outline">
          <Link search={{ tab: 'ageing' }} to="/app/reports">
            Ageing report
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
