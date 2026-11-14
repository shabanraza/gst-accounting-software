import * as React from 'react'
import { skipToken, useQuery } from '@tanstack/react-query'
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  DownloadIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { ToggleGroup, ToggleGroupItem } from '#/components/ui/toggle-group.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { ReturnPeriodFields } from '#/features/gst/components/return-period-fields.tsx'
import {
  sortReportRows,
  toCsv,
} from '#/features/reports-analysis/report-table.ts'
import type { SortDirection } from '#/features/reports-analysis/report-table.ts'
import type {
  InvoiceProfitRow,
  ItemSalesRow,
  PartySalesRow,
} from '#/features/reports-analysis/sales-analysis-service.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { currentGstMonthPeriod } from '#/lib/gst-period.ts'
import { cn } from '#/lib/utils.ts'

type View = 'items' | 'parties' | 'invoices'

type CellKind = 'text' | 'quantity' | 'count' | 'money' | 'profit' | 'percent'

type Column<TRow> = {
  key: string
  label: string
  kind: CellKind
  value: (row: TRow) => string | number | null
}

const VIEWS: Array<{ value: View; label: string; title: string }> = [
  { value: 'items', label: 'Items', title: 'Item-wise sales and profit' },
  { value: 'parties', label: 'Customers', title: 'Customer-wise sales' },
  { value: 'invoices', label: 'Invoices', title: 'Invoice-wise profit' },
]

const ITEM_COLUMNS: Array<Column<ItemSalesRow>> = [
  { key: 'item', label: 'Item', kind: 'text', value: (r) => r.itemName },
  {
    key: 'sold',
    label: 'Sold',
    kind: 'quantity',
    value: (r) => r.soldQuantity,
  },
  {
    key: 'returned',
    label: 'Returned',
    kind: 'quantity',
    value: (r) => r.returnedQuantity,
  },
  {
    key: 'net',
    label: 'Net qty',
    kind: 'quantity',
    value: (r) => r.netQuantity,
  },
  { key: 'unit', label: 'Unit', kind: 'text', value: (r) => r.unit },
  {
    key: 'taxable',
    label: 'Net taxable',
    kind: 'money',
    value: (r) => r.taxableAmount,
  },
  { key: 'gst', label: 'GST', kind: 'money', value: (r) => r.gstAmount },
  { key: 'cost', label: 'Cost', kind: 'money', value: (r) => r.costAmount },
  {
    key: 'profit',
    label: 'Profit',
    kind: 'profit',
    value: (r) => r.profitAmount,
  },
  {
    key: 'margin',
    label: 'Margin',
    kind: 'percent',
    value: (r) => r.marginPercent,
  },
]

const PARTY_COLUMNS: Array<Column<PartySalesRow>> = [
  {
    key: 'customer',
    label: 'Customer',
    kind: 'text',
    value: (r) => r.customerName,
  },
  {
    key: 'invoices',
    label: 'Invoices',
    kind: 'count',
    value: (r) => r.invoiceCount,
  },
  {
    key: 'taxable',
    label: 'Net taxable',
    kind: 'money',
    value: (r) => r.taxableAmount,
  },
  { key: 'gst', label: 'GST', kind: 'money', value: (r) => r.gstAmount },
  {
    key: 'returns',
    label: 'Returns',
    kind: 'money',
    value: (r) => r.returnedAmount,
  },
  {
    key: 'total',
    label: 'Net total',
    kind: 'money',
    value: (r) => r.totalAmount,
  },
  {
    key: 'outstanding',
    label: 'Outstanding',
    kind: 'money',
    value: (r) => r.outstandingAmount,
  },
]

const INVOICE_COLUMNS: Array<Column<InvoiceProfitRow>> = [
  { key: 'date', label: 'Date', kind: 'text', value: (r) => r.invoiceDate },
  {
    key: 'number',
    label: 'Invoice',
    kind: 'text',
    value: (r) => r.invoiceNumber,
  },
  {
    key: 'customer',
    label: 'Customer',
    kind: 'text',
    value: (r) => r.customerName,
  },
  {
    key: 'taxable',
    label: 'Net taxable',
    kind: 'money',
    value: (r) => r.taxableAmount,
  },
  {
    key: 'returns',
    label: 'Returns',
    kind: 'money',
    value: (r) => r.returnedAmount,
  },
  { key: 'cost', label: 'Cost', kind: 'money', value: (r) => r.costAmount },
  {
    key: 'profit',
    label: 'Profit',
    kind: 'profit',
    value: (r) => r.profitAmount,
  },
  {
    key: 'margin',
    label: 'Margin',
    kind: 'percent',
    value: (r) => r.marginPercent,
  },
]

const DEFAULT_SORT: Record<View, { key: string; direction: SortDirection }> = {
  items: { key: 'taxable', direction: 'desc' },
  parties: { key: 'taxable', direction: 'desc' },
  invoices: { key: 'date', direction: 'desc' },
}

function displayCell(kind: CellKind, value: string | number | null) {
  if (value === null) return '—'
  if (kind === 'money' || kind === 'profit') return formatInr(value)
  if (kind === 'percent') return `${value}%`
  return String(value)
}

function csvValue(value: string | number | null) {
  return value === null ? '' : String(value)
}

function saveCsv(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export function SalesAnalysisPanel() {
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()
  const defaultPeriod = React.useMemo(() => currentGstMonthPeriod(), [])
  const [from, setFrom] = React.useState(defaultPeriod.periodStart)
  const [to, setTo] = React.useState(defaultPeriod.periodEnd)
  const [view, setView] = React.useState<View>('items')
  const [sort, setSort] = React.useState(DEFAULT_SORT.items)

  const input =
    companyId && isReady && from && to && from <= to
      ? { companyId, from, to }
      : skipToken
  const itemQuery = useQuery({
    ...trpc.analysis.itemSales.queryOptions(input),
    enabled: view === 'items',
  })
  const partyQuery = useQuery({
    ...trpc.analysis.partySales.queryOptions(input),
    enabled: view === 'parties',
  })
  const invoiceQuery = useQuery({
    ...trpc.analysis.invoiceProfit.queryOptions(input),
    enabled: view === 'invoices',
  })

  const table = (() => {
    if (view === 'items') {
      return {
        columns: ITEM_COLUMNS,
        rows: itemQuery.data?.rows ?? [],
        rowKey: (row: ItemSalesRow) => row.itemId,
        totals: itemQuery.data
          ? {
              item: 'Total',
              taxable: itemQuery.data.totals.taxableAmount,
              gst: itemQuery.data.totals.gstAmount,
              cost: itemQuery.data.totals.costAmount,
              profit: itemQuery.data.totals.profitAmount,
              margin: itemQuery.data.totals.marginPercent,
            }
          : null,
        isLoading: itemQuery.isLoading,
      }
    }
    if (view === 'parties') {
      return {
        columns: PARTY_COLUMNS,
        rows: partyQuery.data?.rows ?? [],
        rowKey: (row: PartySalesRow) => row.customerId,
        totals: partyQuery.data
          ? {
              customer: 'Total',
              invoices: partyQuery.data.totals.invoiceCount,
              taxable: partyQuery.data.totals.taxableAmount,
              gst: partyQuery.data.totals.gstAmount,
              returns: partyQuery.data.totals.returnedAmount,
              total: partyQuery.data.totals.totalAmount,
              outstanding: partyQuery.data.totals.outstandingAmount,
            }
          : null,
        isLoading: partyQuery.isLoading,
      }
    }
    return {
      columns: INVOICE_COLUMNS,
      rows: invoiceQuery.data?.rows ?? [],
      rowKey: (row: InvoiceProfitRow) => row.invoiceId,
      totals: invoiceQuery.data
        ? {
            date: 'Total',
            taxable: invoiceQuery.data.totals.taxableAmount,
            returns: invoiceQuery.data.totals.returnedAmount,
            cost: invoiceQuery.data.totals.costAmount,
            profit: invoiceQuery.data.totals.profitAmount,
            margin: invoiceQuery.data.totals.marginPercent,
          }
        : null,
      isLoading: invoiceQuery.isLoading,
    }
  })() as {
    columns: Array<Column<unknown>>
    rows: Array<unknown>
    rowKey: (row: unknown) => string
    totals: Record<string, string | number | null> | null
    isLoading: boolean
  }

  const sortColumn =
    table.columns.find((column) => column.key === sort.key) ?? table.columns[0]
  const rows = sortReportRows(table.rows, sortColumn.value, sort.direction)
  const title = VIEWS.find((option) => option.value === view)?.title ?? ''

  function changeView(next: string) {
    if (!next) return
    setView(next as View)
    setSort(DEFAULT_SORT[next as View])
  }

  function toggleSort(key: string, kind: CellKind) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: kind === 'text' ? 'asc' : 'desc' },
    )
  }

  function downloadCsv() {
    const body = rows.map((row) =>
      table.columns.map((column) => csvValue(column.value(row))),
    )
    if (table.totals) {
      const totals = table.totals
      body.push(
        table.columns.map((column) => csvValue(totals[column.key] ?? null)),
      )
    }
    saveCsv(
      toCsv(
        table.columns.map((column) => column.label),
        body,
      ),
      `sales-${view}-${from}-to-${to}.csv`,
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>
          Taxable value net of sales returns; cost is the stock value at the
          time of sale
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 px-0">
        <div className="flex flex-wrap items-end gap-3 px-4">
          <ReturnPeriodFields
            onPeriodEndChange={setTo}
            onPeriodStartChange={setFrom}
            periodEnd={to}
            periodStart={from}
          />
          <ToggleGroup
            aria-label="Report"
            onValueChange={changeView}
            type="single"
            value={view}
            variant="outline"
          >
            {VIEWS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value}>
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <Button
            disabled={rows.length === 0}
            onClick={downloadCsv}
            type="button"
            variant="outline"
          >
            <DownloadIcon data-icon="inline-start" />
            Download CSV
          </Button>
        </div>
        <Table className="min-w-[720px]" data-ui="data">
          <TableHeader>
            <TableRow>
              {table.columns.map((column) => {
                const active = column.key === sortColumn.key
                const SortIcon = !active
                  ? ArrowUpDownIcon
                  : sort.direction === 'asc'
                    ? ArrowUpIcon
                    : ArrowDownIcon
                return (
                  <TableHead
                    aria-sort={
                      active
                        ? sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : undefined
                    }
                    className={cn(column.kind !== 'text' && 'text-right')}
                    key={column.key}
                  >
                    <button
                      className={cn(
                        'inline-flex items-center gap-1 transition-colors duration-(--duration-fast) ease-(--ease-precise) hover:text-foreground',
                        column.kind !== 'text' && 'flex-row-reverse',
                        active && 'text-foreground',
                      )}
                      onClick={() => toggleSort(column.key, column.kind)}
                      type="button"
                    >
                      {column.label}
                      <SortIcon
                        className={cn(
                          'size-3',
                          !active && 'text-muted-foreground/60',
                        )}
                      />
                    </button>
                  </TableHead>
                )
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  className="py-10 text-center text-muted-foreground"
                  colSpan={table.columns.length}
                >
                  {table.isLoading ? 'Loading…' : 'No sales in this period.'}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={table.rowKey(row)}>
                  {table.columns.map((column) => (
                    <ReportCell
                      key={column.key}
                      kind={column.kind}
                      value={column.value(row)}
                    />
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
          {table.totals && rows.length > 0 ? (
            <TableFooter>
              <TableRow>
                {table.columns.map((column) => (
                  <ReportCell
                    className="font-semibold"
                    key={column.key}
                    kind={column.kind}
                    value={table.totals?.[column.key] ?? ''}
                  />
                ))}
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </CardContent>
    </Card>
  )
}

function ReportCell({
  kind,
  value,
  className,
}: {
  kind: CellKind
  value: string | number | null
  className?: string
}) {
  const isLoss =
    kind === 'profit' && typeof value === 'string' && value.startsWith('-')
  return (
    <TableCell
      className={cn(
        kind === 'text'
          ? 'max-w-56 truncate'
          : 'text-right font-mono tabular-nums',
        isLoss && 'text-money-out',
        className,
      )}
    >
      {value === '' ? '' : displayCell(kind, value)}
    </TableCell>
  )
}
