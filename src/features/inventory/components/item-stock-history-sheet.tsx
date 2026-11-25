import { skipToken, useQuery } from '@tanstack/react-query'

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatMediumDate } from '#/lib/calendar-date.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

const movementLabels: Record<string, string> = {
  opening: 'Opening stock',
  purchase_in: 'Purchase',
  sale_out: 'Sale',
  purchase_return_out: 'Purchase return',
  sales_return_in: 'Sales return',
  adjustment: 'Stock gain',
  adjustment_out: 'Stock loss',
  transfer_out: 'Transfer out',
  transfer_in: 'Transfer in',
}

function documentLabel(row: {
  movementType: string
  referenceType: string
  referenceId: string
}) {
  const label = movementLabels[row.movementType] ?? row.movementType
  return row.referenceType === 'stock_journal'
    ? `${row.referenceId} · ${label}`
    : label
}

export type StockHistoryItem = {
  itemId: string
  itemName: string
  unit: string
}

export function ItemStockHistorySheet({
  item,
  onOpenChange,
}: {
  item: StockHistoryItem | null
  onOpenChange: (open: boolean) => void
}) {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()
  const historyQuery = useQuery(
    trpc.inventory.itemStockHistory.queryOptions(
      item && companyId && isReady
        ? { companyId, itemId: item.itemId }
        : skipToken,
    ),
  )
  const rows = historyQuery.data?.rows ?? []

  return (
    <Sheet onOpenChange={onOpenChange} open={Boolean(item)}>
      <SheetContent className="w-full gap-0 sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{item?.itemName ?? 'Stock history'}</SheetTitle>
          <SheetDescription>
            {historyQuery.data
              ? `Closing stock ${historyQuery.data.closingBalance} ${item?.unit ?? ''}`
              : 'Stock history'}
          </SheetDescription>
        </SheetHeader>
        <div
          className="flex min-h-0 flex-1 flex-col overflow-y-auto pb-4"
          data-ui="data"
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Document</TableHead>
                <TableHead className="text-right">In</TableHead>
                <TableHead className="text-right">Out</TableHead>
                <TableHead className="text-right">Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {historyQuery.isLoading ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    Loading history…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    No stock movements yet.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.movementId}>
                    <TableCell className="whitespace-nowrap">
                      {formatMediumDate(row.occurredOn)}
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate">{documentLabel(row)}</span>
                        {row.godownName ? (
                          <span className="truncate text-muted-foreground">
                            {row.godownName}
                          </span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.direction === 'in' ? row.quantity : ''}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.direction === 'out' ? row.quantity : ''}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {row.runningBalance}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SheetContent>
    </Sheet>
  )
}
