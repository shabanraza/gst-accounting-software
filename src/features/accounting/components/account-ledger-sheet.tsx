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
import {
  accountLedgerToCsv,
  formatVoucherType,
} from '#/features/accounting/account-ledger-service.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'
import { formatMediumDate } from '#/lib/calendar-date.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { currentFinancialYearStart } from '#/lib/gst-period.ts'

import type {
  AccountLedger,
  LedgerBalance,
} from '#/features/accounting/account-ledger-service.ts'
import type { LedgerAccountRecord } from '#/features/accounting/chart-of-accounts.ts'

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

function counterLabel(row: AccountLedger['rows'][number]) {
  return row.counterAccounts.map((counter) => counter.name).join(', ')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function printLedger(ledger: AccountLedger, companyName: string) {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    toast.error('Allow pop-ups to print the ledger.')
    return
  }

  const cell = (value: string, numeric = false) =>
    `<td${numeric ? ' class="num"' : ''}>${escapeHtml(value)}</td>`
  const rows = ledger.rows
    .map(
      (row) =>
        `<tr>${cell(formatMediumDate(row.entryDate))}${cell(
          formatVoucherType(row.voucherType),
        )}<td>${escapeHtml(counterLabel(row))}<div class="muted">${escapeHtml(
          row.narration,
        )}</div></td>${cell(formatAmount(row.debit), true)}${cell(
          formatAmount(row.credit),
          true,
        )}${cell(formatBalance(row.balance), true)}</tr>`,
    )
    .join('')

  printWindow.document.write(`<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(`${ledger.account.name} ledger`)}</title>
<style>
body{font-family:"IBM Plex Sans",system-ui,sans-serif;font-size:11px;color:#111;margin:24px}
h1{font-size:15px;margin:0}p{margin:2px 0 12px;color:#555}
table{width:100%;border-collapse:collapse}
th,td{border-bottom:1px solid #ddd;padding:4px 6px;text-align:left;vertical-align:top}
th{font-weight:600}.num{text-align:right;font-family:"JetBrains Mono",ui-monospace,monospace;white-space:nowrap}
.muted{color:#666}tfoot td{font-weight:600}
</style></head><body>
<h1>${escapeHtml(companyName)}</h1>
<p>${escapeHtml(`${ledger.account.name} (${ledger.account.code}) · ${formatMediumDate(ledger.from)} to ${formatMediumDate(ledger.to)}`)}</p>
<table><thead><tr><th>Date</th><th>Type</th><th>Particulars</th><th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th></tr></thead>
<tbody><tr>${cell(formatMediumDate(ledger.from))}${cell('')}${cell('Opening balance')}${cell('')}${cell('')}${cell(formatBalance(ledger.openingBalance), true)}</tr>${rows}</tbody>
<tfoot><tr>${cell('')}${cell('')}${cell('Total')}${cell(formatInr(ledger.totalDebit), true)}${cell(formatInr(ledger.totalCredit), true)}${cell('')}</tr>
<tr>${cell(formatMediumDate(ledger.to))}${cell('')}${cell('Closing balance')}${cell('')}${cell('')}${cell(formatBalance(ledger.closingBalance), true)}</tr></tfoot></table>
</body></html>`)
  printWindow.document.close()
  printWindow.focus()
  printWindow.print()
}

function downloadCsv(ledger: AccountLedger) {
  // Byte-order mark so Excel opens the UTF-8 file with the right encoding.
  const blob = new Blob(
    [String.fromCharCode(0xfeff), accountLedgerToCsv(ledger)],
    {
      type: 'text/csv;charset=utf-8',
    },
  )
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download =
    `${ledger.account.code}-${ledger.account.name}-ledger-${ledger.from}-to-${ledger.to}.csv`
      .replace(/[^\w.-]+/g, '-')
      .toLowerCase()
  link.click()
  URL.revokeObjectURL(url)
}

type AccountLedgerSheetProps = {
  account: LedgerAccountRecord | null
  onOpenChange: (open: boolean) => void
}

export function AccountLedgerSheet({
  account,
  onOpenChange,
}: AccountLedgerSheetProps) {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()
  const [range, setRange] = React.useState(currentFinancialYearRange)
  const isRangeValid = range.from <= range.to

  const ledgerQuery = useQuery(
    trpc.accounting.accountLedger.queryOptions(
      companyId && isReady && account && isRangeValid
        ? {
            companyId,
            ledgerAccountId: account.id,
            from: range.from,
            to: range.to,
          }
        : skipToken,
    ),
  )
  const ledger = ledgerQuery.data

  return (
    <Sheet onOpenChange={onOpenChange} open={account !== null}>
      <SheetContent className="gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-4xl">
        <SheetHeader className="gap-1 border-b pr-12">
          <SheetTitle>{account?.name ?? 'Ledger'}</SheetTitle>
          <SheetDescription>
            {account ? `${account.code} · ledger statement` : ''}
          </SheetDescription>
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
                disabled={!ledger}
                onClick={() =>
                  ledger &&
                  printLedger(
                    ledger,
                    company?.tradeName || company?.legalName || '',
                  )
                }
                variant="outline"
              >
                <PrinterIcon data-icon="inline-start" />
                Print
              </Button>
              <Button
                disabled={!ledger}
                onClick={() => ledger && downloadCsv(ledger)}
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
          ) : ledgerQuery.isError ? (
            <p className="text-sm text-destructive">
              {ledgerQuery.error.message}
            </p>
          ) : !ledger ? (
            <p className="text-sm text-muted-foreground">Loading ledger…</p>
          ) : (
            <Table className="min-w-[44rem]">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead className="w-24">Type</TableHead>
                  <TableHead>Particulars</TableHead>
                  <TableHead className="w-28 text-right">Debit</TableHead>
                  <TableHead className="w-28 text-right">Credit</TableHead>
                  <TableHead className="w-36 text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">
                    {formatMediumDate(ledger.from)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="font-medium">Opening balance</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatBalance(ledger.openingBalance)}
                  </TableCell>
                </TableRow>
                {ledger.rows.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={6}
                    >
                      No postings in this period.
                    </TableCell>
                  </TableRow>
                ) : (
                  ledger.rows.map((row) => (
                    <TableRow key={row.entryId}>
                      <TableCell className="whitespace-nowrap">
                        {formatMediumDate(row.entryDate)}
                      </TableCell>
                      <TableCell>
                        {formatVoucherType(row.voucherType)}
                      </TableCell>
                      <TableCell className="max-w-72">
                        <div className="truncate font-medium">
                          {counterLabel(row)}
                        </div>
                        <div className="truncate text-muted-foreground">
                          {row.narration}
                        </div>
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
                  <TableCell colSpan={3} className="font-medium">
                    Total
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatInr(ledger.totalDebit)}
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums">
                    {formatInr(ledger.totalCredit)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <TableCell className="text-muted-foreground">
                    {formatMediumDate(ledger.to)}
                  </TableCell>
                  <TableCell />
                  <TableCell className="font-medium">Closing balance</TableCell>
                  <TableCell />
                  <TableCell />
                  <TableCell className="text-right font-mono font-medium tabular-nums whitespace-nowrap">
                    {formatBalance(ledger.closingBalance)}
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
