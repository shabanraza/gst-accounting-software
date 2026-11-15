import * as React from 'react'
import { skipToken, useQuery } from '@tanstack/react-query'
import { DownloadIcon, PrinterIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import { Label } from '#/components/ui/label.tsx'
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
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import {
  formatStatementKind,
  partyStatementToCsv,
} from '#/features/parties/party-statement-service.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { formatMediumDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { currentFinancialYearStart } from '#/lib/gst-period.ts'

import type { LedgerBalance } from '#/features/accounting/account-ledger-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type { PartyStatement } from '#/features/parties/party-statement-service.ts'

function currentFinancialYearRange() {
  const from = currentFinancialYearStart()
  return { from, to: `${Number(from.slice(0, 4)) + 1}-03-31` }
}

function formatBalance(balance: LedgerBalance) {
  return `${formatInr(balance.amount)} ${balance.side}`
}

function formatAmount(amount: string) {
  return Number(amount) === 0 ? '' : formatInr(amount)
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function printStatement(statement: PartyStatement, companyName: string) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    toast.error('Allow pop-ups to print the statement.')
    return
  }

  const cell = (value: string, numeric = false) =>
    `<td${numeric ? ' class="num"' : ''}>${escapeHtml(value)}</td>`
  const rows = statement.rows
    .map(
      (row) =>
        `<tr>${cell(formatMediumDate(row.date))}${cell(
          formatStatementKind(row.kind),
        )}${cell(row.documentNumber)}${cell(row.particulars)}${cell(
          formatAmount(row.debit),
          true,
        )}${cell(formatAmount(row.credit), true)}${cell(
          formatBalance(row.balance),
          true,
        )}</tr>`,
    )
    .join('')

  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(`${statement.party.name} statement`)}</title>
<style>
body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:11px;color:#111;margin:24px}
h1{font-size:15px;margin:0}h2{font-size:13px;margin:12px 0 0}p{margin:2px 0 12px;color:#555}
table{width:100%;border-collapse:collapse}
th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}
th{font-weight:600}.num{text-align:right;font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap}
tfoot td{font-weight:600}
</style></head><body>
<h1>${escapeHtml(companyName)}</h1>
<h2>Statement of account: ${escapeHtml(statement.party.name)}</h2>
<p>${escapeHtml(`${formatMediumDate(statement.from)} to ${formatMediumDate(statement.to)}`)}</p>
<table><thead><tr><th>Date</th><th>Type</th><th>Number</th><th>Particulars</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
<tbody><tr>${cell(formatMediumDate(statement.from))}${cell('')}${cell('')}${cell('Opening balance')}${cell('')}${cell('')}${cell(formatBalance(statement.openingBalance), true)}</tr>${rows}</tbody>
<tfoot><tr>${cell('')}${cell('')}${cell('')}${cell('Total')}${cell(formatInr(statement.totalDebit), true)}${cell(formatInr(statement.totalCredit), true)}${cell('')}</tr>
<tr>${cell(formatMediumDate(statement.to))}${cell('')}${cell('')}${cell('Closing balance')}${cell('')}${cell('')}${cell(formatBalance(statement.closingBalance), true)}</tr></tfoot></table>
</body></html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function downloadCsv(statement: PartyStatement) {
  // Byte-order mark so Excel opens the UTF-8 file with the right encoding.
  const blob = new Blob(
    [String.fromCharCode(0xfeff), partyStatementToCsv(statement)],
    { type: 'text/csv;charset=utf-8' },
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download =
    `${statement.party.name}-statement-${statement.from}-to-${statement.to}.csv`
      .replace(/[^\w.-]+/g, '-')
      .toLowerCase()
  link.click()
  URL.revokeObjectURL(url)
}

type PartyStatementSheetProps = {
  party: PartyRecord | null
  onOpenChange: (open: boolean) => void
}

export function PartyStatementSheet({
  party,
  onOpenChange,
}: PartyStatementSheetProps) {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()
  const [range, setRange] = React.useState(currentFinancialYearRange)
  const isRangeValid = range.from <= range.to

  const statementQuery = useQuery(
    trpc.reports.partyStatement.queryOptions(
      companyId && isReady && party && isRangeValid
        ? { companyId, partyId: party.id, from: range.from, to: range.to }
        : skipToken,
    ),
  )
  const statement = statementQuery.data

  return (
    <Sheet onOpenChange={onOpenChange} open={party !== null}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-4xl">
        <SheetHeader className="gap-1 border-b pr-12">
          <SheetTitle>{party?.name ?? 'Statement'}</SheetTitle>
          <SheetDescription>Statement of account</SheetDescription>
        </SheetHeader>

        <div
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 sm:p-6"
          data-ui="data"
        >
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>From</Label>
              <DatePicker
                formatValue={formatMediumDate}
                onChange={(from) =>
                  setRange((current) => ({ ...current, from }))
                }
                value={range.from}
                variant="toolbar"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>To</Label>
              <DatePicker
                formatValue={formatMediumDate}
                min={range.from}
                onChange={(to) => setRange((current) => ({ ...current, to }))}
                value={range.to}
                variant="toolbar"
              />
            </div>
            <div className="ml-auto flex gap-2">
              <Button
                disabled={!statement}
                onClick={() =>
                  statement &&
                  printStatement(
                    statement,
                    company?.tradeName || company?.legalName || '',
                  )
                }
                variant="outline"
              >
                <PrinterIcon data-icon="inline-start" />
                Print
              </Button>
              <Button
                disabled={!statement}
                onClick={() => statement && downloadCsv(statement)}
                variant="outline"
              >
                <DownloadIcon data-icon="inline-start" />
                CSV
              </Button>
            </div>
          </div>

          {!isRangeValid ? (
            <p className="text-sm text-muted-foreground">
              The start date must be on or before the end date.
            </p>
          ) : statementQuery.isError ? (
            <p className="text-sm text-destructive">
              {statementQuery.error.message}
            </p>
          ) : !statement ? (
            <p className="text-sm text-muted-foreground">Loading statement…</p>
          ) : (
            <Table className="min-w-[48rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-28">Type</TableHead>
                  <TableHead className="w-28">Number</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="w-28 text-right">Debit</TableHead>
                  <TableHead className="w-28 text-right">Credit</TableHead>
                  <TableHead className="w-36 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">
                    {formatMediumDate(statement.from)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="font-medium">Opening balance</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                    {formatBalance(statement.openingBalance)}
                  </TableCell>
                </TableRow>
                {statement.rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      No transactions in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  statement.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatMediumDate(row.date)}
                      </TableCell>
                      <TableCell>{formatStatementKind(row.kind)}</TableCell>
                      <TableCell className="font-mono text-xs whitespace-nowrap">
                        {row.documentNumber}
                      </TableCell>
                      <TableCell className="max-w-64 truncate">
                        {row.particulars}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatAmount(row.debit)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums">
                        {formatAmount(row.credit)}
                      </TableCell>
                      <TableCell className="text-right font-mono tabular-nums whitespace-nowrap">
                        {formatBalance(row.balance)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={4} className="font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatInr(statement.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatInr(statement.totalCredit)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">
                    {formatMediumDate(statement.to)}
                  </TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="font-medium">Closing balance</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono font-medium tabular-nums whitespace-nowrap">
                    {formatBalance(statement.closingBalance)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
