import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { WarehouseIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { stockStatusBadgeIntent } from '#/lib/badge-intent.ts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { SearchInput } from '#/components/ui/search-input.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { ScrollableTabsList } from '#/components/ui/scrollable-tabs-list.tsx'
import { Tabs, TabsTrigger } from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function InventoryPanel() {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'healthy' | 'low'
  >('all')

  const stockQuery = useQuery({
    ...trpc.inventory.listStockBalances.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const rows = stockQuery.data ?? []
  const filtered = rows.filter((row) => {
    const isLow = Number(row.quantity) < 1
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'low' ? isLow : !isLow)
    const haystack = row.itemName.toLowerCase()
    return matchesStatus && haystack.includes(query.trim().toLowerCase())
  })

  const totalValue = filtered.reduce(
    (sum, row) => sum + Number(row.quantity) * Number(row.avgRate),
    0,
  )
  const lowCount = filtered.filter((row) => Number(row.quantity) < 1).length

  return (
    <WorkspacePage
      description="Godown-agnostic stock balances from the movement ledger API."
      title="Inventory"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lines shown</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filtered.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock value (avg)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatInr(totalValue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Zero / low</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{lowCount}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <WarehouseIcon className="size-4 text-muted-foreground" />
              Stock status
            </CardTitle>
            <CardDescription>
              Live balances from opening / purchase / sale movements
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <Tabs
              onValueChange={(value) =>
                setStatusFilter(value as 'all' | 'healthy' | 'low')
              }
              value={statusFilter}
            >
              <ScrollableTabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="healthy">In stock</TabsTrigger>
                <TabsTrigger value="low">Low / zero</TabsTrigger>
              </ScrollableTabsList>
            </Tabs>
            <SearchInput
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search item"
              value={query}
              wrapperClassName="w-full max-w-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Avg rate</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stockQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    Loading stock…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={6}
                  >
                    No stock balances yet. Add opening stock on an item.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((row) => {
                  const isLow = Number(row.quantity) < 1
                  const value = Number(row.quantity) * Number(row.avgRate)
                  return (
                    <TableRow key={row.itemId}>
                      <TableCell className="font-medium">
                        {row.itemName}
                      </TableCell>
                      <TableCell className="tabular-nums">
                        {row.quantity}
                      </TableCell>
                      <TableCell>{row.unit}</TableCell>
                      <TableCell>{formatInr(row.avgRate)}</TableCell>
                      <TableCell>{formatInr(value)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={stockStatusBadgeIntent({
                            isLowOrZero: isLow,
                          })}
                        >
                          {isLow ? 'Low / zero' : 'In stock'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
