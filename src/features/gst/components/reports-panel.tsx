import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { DownloadIcon, FileBarChartIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
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
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '#/components/ui/tabs.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function ReportsPanel() {
  const trpc = useTRPC()
  const { companyId, company, isReady } = useWorkspace()
  const [tab, setTab] = React.useState('gstr1')
  const periodStart = '2026-04-01'
  const periodEnd = '2027-03-31'

  const gstr1Query = useQuery({
    ...trpc.reports.gstr1.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      companyStateCode: company?.stateCode ?? '27',
      periodStart,
      periodEnd,
    }),
    enabled: Boolean(companyId) && isReady && tab === 'gstr1',
  })
  const gstr3bQuery = useQuery({
    ...trpc.reports.gstr3b.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      companyStateCode: company?.stateCode ?? '27',
      periodStart,
      periodEnd,
    }),
    enabled: Boolean(companyId) && isReady && tab === 'gstr3b',
  })
  const trialQuery = useQuery({
    ...trpc.reports.trialBalance.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'trial',
  })
  const profitAndLossQuery = useQuery({
    ...trpc.reports.profitAndLoss.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'pl',
  })
  const balanceSheetQuery = useQuery({
    ...trpc.reports.balanceSheet.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'bs',
  })
  const receivablesAgeingQuery = useQuery({
    ...trpc.reports.receivablesAgeing.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'ageing',
  })
  const payablesAgeingQuery = useQuery({
    ...trpc.reports.payablesAgeing.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'ageing',
  })
  const stockSummaryQuery = useQuery({
    ...trpc.reports.stockSummary.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'stock',
  })
  const dayBookQuery = useQuery({
    ...trpc.reports.dayBook.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      companyStateCode: company?.stateCode ?? '27',
      periodStart,
      periodEnd,
    }),
    enabled: Boolean(companyId) && isReady && tab === 'daybook',
  })
  const cashBookQuery = useQuery({
    ...trpc.reports.cashBook.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      companyStateCode: company?.stateCode ?? '27',
      periodStart,
      periodEnd,
    }),
    enabled: Boolean(companyId) && isReady && tab === 'cashbook',
  })
  const hsnSummaryQuery = useQuery({
    ...trpc.reports.hsnSummary.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
      companyStateCode: company?.stateCode ?? '27',
      periodStart,
      periodEnd,
    }),
    enabled: Boolean(companyId) && isReady && tab === 'hsn',
  })
  const exportQuery = useQuery({
    ...trpc.reports.accountantExport.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'export',
  })

  function downloadExport() {
    if (!exportQuery.data || !companyId) return
    const blob = new Blob([JSON.stringify(exportQuery.data, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `accountant-export-${companyId}.json`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <WorkspacePage
      description="Live GSTR working reports and trial balance from posted documents."
      title="Reports"
    >
      <Tabs onValueChange={setTab} value={tab}>
        <TabsList>
          <TabsTrigger value="gstr1">GSTR-1</TabsTrigger>
          <TabsTrigger value="gstr3b">GSTR-3B</TabsTrigger>
          <TabsTrigger value="trial">Trial balance</TabsTrigger>
          <TabsTrigger value="pl">Profit &amp; loss</TabsTrigger>
          <TabsTrigger value="bs">Balance sheet</TabsTrigger>
          <TabsTrigger value="ageing">Ageing</TabsTrigger>
          <TabsTrigger value="stock">Stock summary</TabsTrigger>
          <TabsTrigger value="daybook">Day book</TabsTrigger>
          <TabsTrigger value="cashbook">Cash book</TabsTrigger>
          <TabsTrigger value="hsn">HSN summary</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-4" value="gstr1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileBarChartIcon className="size-4 text-muted-foreground" />
                GSTR-1 working report
              </CardTitle>
              <CardDescription>
                FY {periodStart} to {periodEnd} · taxable{' '}
                {formatInr(gstr1Query.data?.totalTaxableValue ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Party</TableHead>
                    <TableHead>GSTIN</TableHead>
                    <TableHead>Taxable</TableHead>
                    <TableHead>Tax</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(gstr1Query.data?.b2b ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No outward supplies in period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (gstr1Query.data?.b2b ?? []).map((row) => (
                      <TableRow key={row.invoiceNumber}>
                        <TableCell className="font-medium">
                          {row.invoiceNumber}
                        </TableCell>
                        <TableCell>{row.partyName}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.partyGstin ?? 'URP'}
                        </TableCell>
                        <TableCell>{formatInr(row.taxableAmount)}</TableCell>
                        <TableCell>{formatInr(row.totalGstAmount)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="gstr3b">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Output GST</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(gstr3bQuery.data?.outputGst ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Input GST / ITC</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(gstr3bQuery.data?.inputGst ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net payable</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(gstr3bQuery.data?.netGstPayable ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="mt-4" value="trial">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trial balance</CardTitle>
              <CardDescription>
                Chart of accounts skeleton (balances filled as books deepen)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(trialQuery.data ?? []).map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-mono text-xs">
                        {row.code}
                      </TableCell>
                      <TableCell className="font-medium">{row.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.accountType}</Badge>
                      </TableCell>
                      <TableCell>{formatInr(row.debit)}</TableCell>
                      <TableCell>{formatInr(row.credit)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="pl">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total income</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(profitAndLossQuery.data?.totalIncome ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total expense</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(profitAndLossQuery.data?.totalExpense ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net profit</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(profitAndLossQuery.data?.netProfit ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Income</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableBody>
                    {(profitAndLossQuery.data?.incomeRows ?? []).map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Expenses</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableBody>
                    {(profitAndLossQuery.data?.expenseRows ?? []).map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="mt-4" value="bs">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total assets</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(balanceSheetQuery.data?.totalAssets ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total liabilities</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(balanceSheetQuery.data?.totalLiabilities ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Equity + net profit</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(
                    Number(balanceSheetQuery.data?.totalEquity ?? 0) +
                      Number(balanceSheetQuery.data?.netProfit ?? 0),
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assets</CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableBody>
                    {(balanceSheetQuery.data?.assetRows ?? []).map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Liabilities &amp; equity
                </CardTitle>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableBody>
                    {[
                      ...(balanceSheetQuery.data?.liabilityRows ?? []),
                      ...(balanceSheetQuery.data?.equityRows ?? []),
                    ].map((row) => (
                      <TableRow key={row.accountId}>
                        <TableCell>{row.name}</TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="mt-4" value="ageing">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Receivables ageing</CardTitle>
                <CardDescription>Outstanding customer invoices</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Bucket</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(receivablesAgeingQuery.data?.rows ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="py-10 text-center text-muted-foreground"
                          colSpan={5}
                        >
                          No outstanding receivables.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (receivablesAgeingQuery.data?.rows ?? []).map((row) => (
                        <TableRow key={row.documentNumber}>
                          <TableCell>{row.partyName}</TableCell>
                          <TableCell>{row.documentNumber}</TableCell>
                          <TableCell>{row.daysOutstanding}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.bucket}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatInr(row.outstandingAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payables ageing</CardTitle>
                <CardDescription>Outstanding supplier bills</CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Party</TableHead>
                      <TableHead>Bill</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Bucket</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(payablesAgeingQuery.data?.rows ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          className="py-10 text-center text-muted-foreground"
                          colSpan={5}
                        >
                          No outstanding payables.
                        </TableCell>
                      </TableRow>
                    ) : (
                      (payablesAgeingQuery.data?.rows ?? []).map((row) => (
                        <TableRow key={row.documentNumber}>
                          <TableCell>{row.partyName}</TableCell>
                          <TableCell>{row.documentNumber}</TableCell>
                          <TableCell>{row.daysOutstanding}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.bucket}</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {formatInr(row.outstandingAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent className="mt-4" value="stock">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock summary</CardTitle>
              <CardDescription>Current quantity on hand by item</CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty on hand</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stockSummaryQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={3}
                      >
                        No stock movements recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (stockSummaryQuery.data ?? []).map((row) => (
                      <TableRow key={row.itemId}>
                        <TableCell className="font-medium">
                          {row.itemName}
                        </TableCell>
                        <TableCell>{row.baseUnit}</TableCell>
                        <TableCell className="text-right">
                          {row.quantityOnHand}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="daybook">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Day book</CardTitle>
              <CardDescription>
                All ledger vouchers between {periodStart} and {periodEnd}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(dayBookQuery.data?.entries ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No ledger entries in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (dayBookQuery.data?.entries ?? []).map((entry) => (
                      <TableRow key={entry.entryId}>
                        <TableCell>{entry.entryDate}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.voucherType}</Badge>
                        </TableCell>
                        <TableCell className="max-w-64 truncate">
                          {entry.narration}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInr(entry.totalDebit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInr(entry.totalCredit)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="cashbook">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cash book</CardTitle>
              <CardDescription>
                Cash and bank movements · closing{' '}
                {formatInr(cashBookQuery.data?.closingBalance ?? 0)}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Narration</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(cashBookQuery.data?.lines ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No cash or bank movements in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (cashBookQuery.data?.lines ?? []).map((line, index) => (
                      <TableRow key={`${line.entryId}-${index}`}>
                        <TableCell>{line.entryDate}</TableCell>
                        <TableCell>{line.ledgerName}</TableCell>
                        <TableCell className="max-w-64 truncate">
                          {line.narration}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInr(line.debit)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInr(line.credit)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="hsn">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">HSN summary</CardTitle>
              <CardDescription>
                Sales taxable value and GST grouped by HSN code
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>HSN</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Taxable</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(hsnSummaryQuery.data?.rows ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={4}
                      >
                        No taxable sales in this period.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (hsnSummaryQuery.data?.rows ?? []).map((row) => (
                      <TableRow key={row.hsnCode}>
                        <TableCell className="font-medium">{row.hsnCode}</TableCell>
                        <TableCell className="text-right">{row.quantity}</TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.taxableAmount)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.gstAmount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent className="mt-4" value="export">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accountant export</CardTitle>
              <CardDescription>
                Trial balance, sales invoices, and purchase bills as JSON
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Sales invoices</p>
                  <p className="text-lg font-semibold">
                    {exportQuery.data?.salesInvoices.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Purchase bills</p>
                  <p className="text-lg font-semibold">
                    {exportQuery.data?.purchaseBills.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">Trial balance rows</p>
                  <p className="text-lg font-semibold">
                    {exportQuery.data?.trialBalance.rows.length ?? 0}
                  </p>
                </div>
              </div>
              <Button
                className="w-fit"
                disabled={!exportQuery.data}
                onClick={downloadExport}
              >
                <DownloadIcon data-icon="inline-start" />
                Download JSON pack
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </WorkspacePage>
  )
}
