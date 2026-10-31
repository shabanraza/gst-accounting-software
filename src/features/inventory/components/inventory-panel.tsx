import * as React from 'react'
import { skipToken, useQuery } from '@tanstack/react-query'
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
import { ActiveFilterChip } from '#/features/app-shell/components/active-filter-chip.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { resolveListFilter } from '#/features/app-shell/list-filter.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function InventoryPanel({
  itemId,
  onClearItemFilter,
}: {
  itemId?: string
  onClearItemFilter?: () => void
}) {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()
  const [query, setQuery] = React.useState('')
  const [statusFilter, setStatusFilter] = React.useState<
    'all' | 'healthy' | 'low'
  >('all')

  const stockQuery = useQuery(
    trpc.inventory.listStockBalances.queryOptions(
      companyId && isReady ? { companyId } : skipToken,
    ),
  )

  const rows = stockQuery.data ?? []
  const itemFilter = resolveListFilter(
    itemId,
    rows.map((row) => ({ id: row.itemId, label: row.itemName })),
    stockQuery.isSuccess,
  )
  const filtered = rows.filter((row) => {
    if (itemFilter.id && row.itemId !== itemFilter.id) return false
    const isLow = row.isLow
    const matchesStatus =
      statusFilter === 'all' || (statusFilter === 'low' ? isLow : !isLow)
    const haystack = row.itemName.toLowerCase()
    return matchesStatus && haystack.includes(query.trim().toLowerCase())
  })

  const totalValue = filtered.reduce(
    (sum, row) => sum + Number(row.quantity) * Number(row.avgRate),
    0,
  )
  const lowCount = filtered.filter((row) => row.isLow).length

  return (
    <WorkspacePage
      description="Stock on hand for every item, across all godowns."
      title="Inventory"
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Items</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {filtered.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Stock value</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {formatInr(totalValue)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Low stock</CardDescription>
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
              Quantity and value on hand, updated with every purchase and sale
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <Tabs
                onValueChange={(value) =>
                  setStatusFilter(value as 'all' | 'healthy' | 'low')
                }
                value={statusFilter}
              >
                <ScrollableTabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="healthy">In stock</TabsTrigger>
                  <TabsTrigger value="low">Low stock</TabsTrigger>
                </ScrollableTabsList>
              </Tabs>
              {itemFilter.id && onClearItemFilter ? (
                <ActiveFilterChip
                  label={itemFilter.label ?? 'Selected item'}
                  onClear={onClearItemFilter}
                />
              ) : null}
            </div>
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
                  const isLow = row.isLow
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
                          {isLow ? 'Low stock' : 'In stock'}
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
