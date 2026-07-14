import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DownloadIcon, FileBarChartIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
import { gstReconciliationBadgeIntent } from '#/lib/badge-intent.ts'
import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { DatePicker } from '#/components/ui/date-picker.tsx'
import { Input } from '#/components/ui/input.tsx'
import { Textarea } from '#/components/ui/textarea.tsx'
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
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { requireTrimmed, requireWorkspace } from '#/lib/form-validation.ts'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { Label } from '#/components/ui/label.tsx'
import { currentGstMonthPeriod } from '#/lib/gst-period.ts'
import { parseGstr1PortalJson } from '#/features/gst/gstr1-portal-parser.ts'
import type { Gstr1ReconciliationReport } from '#/features/gst/gstr1-reconciliation-service.ts'
import { parseGstr2bPortalJson } from '#/features/gst/gstr2b-portal-parser.ts'
import { storeGstr2bPurchasePrefill } from '#/features/gst/gstr2b-purchase-prefill.ts'
import type { Gstr2bItcStatus } from '#/features/gst/gst-reconciliation-store.ts'
import type {
  Gstr2bReconciliationReport,
  Gstr2bRow,
} from '#/features/gst/gstr2b-reconciliation-service.ts'
import type { Gstr3bWorkingReport } from '#/features/gst/gstr3b-working-service.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function ReportsPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { companyId, company, isReady } = useWorkspace()
  const [tab, setTab] = React.useState('gstr1')
  const defaultReconPeriod = React.useMemo(() => currentGstMonthPeriod(), [])
  const [reconPeriodStart, setReconPeriodStart] = React.useState(
    defaultReconPeriod.periodStart,
  )
  const [reconPeriodEnd, setReconPeriodEnd] = React.useState(
    defaultReconPeriod.periodEnd,
  )
  const [gstr2bText, setGstr2bText] = React.useState('')
  const [gstr2bPortalRows, setGstr2bPortalRows] = React.useState<Array<Gstr2bRow>>(
    [],
  )
  const [gstr2bReport, setGstr2bReport] =
    React.useState<Gstr2bReconciliationReport | null>(null)
  const [gstr3bWorking, setGstr3bWorking] =
    React.useState<Gstr3bWorkingReport | null>(null)
  const [gstr1ReconText, setGstr1ReconText] = React.useState('')
  const [gstr1ReconReport, setGstr1ReconReport] =
    React.useState<Gstr1ReconciliationReport | null>(null)
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
  const stockValuationQuery = useQuery({
    ...trpc.reports.stockValuation.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && tab === 'valuation',
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

  const [gstr2bLoading, setGstr2bLoading] = React.useState(false)
  const gstr2bItcMutation = useMutation(
    trpc.reports.setGstr2bItcDecision.mutationOptions(),
  )
  const gstr3bWorkingMutation = useMutation(
    trpc.reports.gstr3bWorking.mutationOptions(),
  )
  const gstr1ReconMutation = useMutation(
    trpc.reports.gstr1Reconciliation.mutationOptions(),
  )

  async function refreshGstr2bReport(portalRows: Array<Gstr2bRow>) {
    if (!companyId) return null
    setGstr2bLoading(true)
    try {
      const report = await queryClient.fetchQuery(
        trpc.reports.gstr2bReconciliation.queryOptions({
          companyId,
          companyStateCode: company?.stateCode ?? '27',
          periodStart: reconPeriodStart,
          periodEnd: reconPeriodEnd,
          portalRows,
        }),
      )
      setGstr2bReport(report)
      const working = await gstr3bWorkingMutation.mutateAsync({
        companyId,
        companyStateCode: company?.stateCode ?? '27',
        periodStart: reconPeriodStart,
        periodEnd: reconPeriodEnd,
        portalRows,
      })
      setGstr3bWorking(working)
      return report
    } finally {
      setGstr2bLoading(false)
    }
  }

  async function handleGstr2bFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setGstr2bText(await file.text())
    } catch {
      toast.error('Could not read the uploaded file')
    } finally {
      event.target.value = ''
    }
  }

  async function runGstr2bReconciliation() {
    if (!requireWorkspace(companyId)) return
    if (!requireTrimmed(gstr2bText, 'GSTR-2B portal data')) return
    try {
      const portalRows = parseGstr2bPortalJson(gstr2bText)
      setGstr2bPortalRows(portalRows)
      await refreshGstr2bReport(portalRows)
    } catch (err) {
      toastActionError(err, 'GSTR-2B reconciliation failed')
    }
  }

  async function setGstr2bItcStatus(rowKey: string, status: Gstr2bItcStatus) {
    if (!requireWorkspace(companyId) || gstr2bPortalRows.length === 0) return
    try {
      await gstr2bItcMutation.mutateAsync({
        companyId,
        companyStateCode: company?.stateCode ?? '27',
        periodStart: reconPeriodStart,
        periodEnd: reconPeriodEnd,
        rowKey,
        status,
        portalRows: gstr2bPortalRows,
      })
      await refreshGstr2bReport(gstr2bPortalRows)
    } catch (err) {
      toastActionError(err, 'Could not update ITC decision')
    }
  }

  async function runGstr1Reconciliation() {
    if (!requireWorkspace(companyId)) return
    if (!requireTrimmed(gstr1ReconText, 'GSTR-1 portal data')) return
    try {
      const portalRows = parseGstr1PortalJson(gstr1ReconText)
      const report = await gstr1ReconMutation.mutateAsync({
        companyId,
        periodStart: reconPeriodStart,
        periodEnd: reconPeriodEnd,
        portalRows,
      })
      setGstr1ReconReport(report)
    } catch (err) {
      toastActionError(err, 'GSTR-1 reconciliation failed')
    }
  }

  function downloadExport() {
    if (!requireWorkspace(companyId) || !exportQuery.data) return
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
          <TabsTrigger value="valuation">Stock valuation</TabsTrigger>
          <TabsTrigger value="daybook">Day book</TabsTrigger>
          <TabsTrigger value="cashbook">Cash book</TabsTrigger>
          <TabsTrigger value="hsn">HSN summary</TabsTrigger>
          <TabsTrigger value="gstr2b">GSTR-2B</TabsTrigger>
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
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">GSTR-1 vs books</CardTitle>
              <CardDescription>
                Paste filed GSTR-1 JSON and reconcile against sales invoices for{' '}
                {reconPeriodStart} to {reconPeriodEnd}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Period start</Label>
                  <DatePicker
                    onChange={setReconPeriodStart}
                    value={reconPeriodStart}
                    variant="toolbar"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Period end</Label>
                  <DatePicker
                    onChange={setReconPeriodEnd}
                    value={reconPeriodEnd}
                    variant="toolbar"
                  />
                </div>
              </div>
              <Textarea
                className="min-h-32 font-mono text-xs"
                onChange={(event) => setGstr1ReconText(event.target.value)}
                placeholder='[{"customerGstin":"24AAAA...","invoiceNumber":"INV-1","invoiceDate":"2026-01-06","taxableAmount":"1000.00","totalGstAmount":"180.00"}]'
                value={gstr1ReconText}
              />
              <Button
                disabled={!companyId || gstr1ReconMutation.isPending}
                onClick={runGstr1Reconciliation}
                type="button"
              >
                Reconcile GSTR-1
              </Button>
              {gstr1ReconReport ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-4">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Matched</p>
                      <p className="text-lg font-semibold">
                        {gstr1ReconReport.summary.matchedCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Mismatched</p>
                      <p className="text-lg font-semibold">
                        {gstr1ReconReport.summary.mismatchedCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Missing in books
                      </p>
                      <p className="text-lg font-semibold">
                        {gstr1ReconReport.summary.missingInBooksCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Missing in GSTR-1
                      </p>
                      <p className="text-lg font-semibold">
                        {gstr1ReconReport.summary.missingInGstr1Count}
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>GSTIN</TableHead>
                        <TableHead>Books taxable</TableHead>
                        <TableHead>GSTR-1 taxable</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gstr1ReconReport.rows.map((row) => (
                        <TableRow key={row.rowKey}>
                          <TableCell className="font-medium">
                            {row.invoiceNumber}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.customerGstin ?? '—'}
                          </TableCell>
                          <TableCell>
                            {row.bookTaxableAmount
                              ? formatInr(row.bookTaxableAmount)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {row.portalTaxableAmount
                              ? formatInr(row.portalTaxableAmount)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={gstReconciliationBadgeIntent(row.status)}
                            >
                              {row.status.replaceAll('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : null}
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
                <CardDescription>Input GST / ITC (books)</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(gstr3bQuery.data?.inputGst ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Net payable (books ITC)</CardDescription>
                <CardTitle className="text-2xl">
                  {formatInr(gstr3bQuery.data?.netGstPayable ?? 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
          {gstr3bWorking ? (
            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Accepted ITC (2B)</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatInr(gstr3bWorking.acceptedInputGst)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Pending ITC</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatInr(gstr3bWorking.pendingInputGst)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Rejected ITC</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatInr(gstr3bWorking.rejectedInputGst)}
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Net payable (accepted ITC)</CardDescription>
                  <CardTitle className="text-2xl">
                    {formatInr(gstr3bWorking.netGstPayableWithAcceptedItc)}
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          ) : null}
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
                        <Badge variant="secondary">{row.accountType}</Badge>
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
                            <Badge variant="neutral">{row.bucket}</Badge>
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
                            <Badge variant="neutral">{row.bucket}</Badge>
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
              <CardDescription>
                Current quantity on hand by item
              </CardDescription>
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

        <TabsContent className="mt-4" value="valuation">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Stock valuation</CardTitle>
              <CardDescription>
                Quantity on hand valued at item purchase rate (weighted average
                placeholder)
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Avg rate</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(stockValuationQuery.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell
                        className="py-10 text-center text-muted-foreground"
                        colSpan={5}
                      >
                        No inventory to value.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (stockValuationQuery.data ?? []).map((row) => (
                      <TableRow key={row.itemId}>
                        <TableCell className="font-medium">
                          {row.itemName}
                        </TableCell>
                        <TableCell>{row.unit}</TableCell>
                        <TableCell className="text-right">
                          {row.quantity}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInr(row.avgRate)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatInr(row.stockValue)}
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
                          <Badge variant="neutral">{entry.voucherType}</Badge>
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
                        <TableCell className="font-medium">
                          {row.hsnCode}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.quantity}
                        </TableCell>
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

        <TabsContent className="mt-4" value="gstr2b">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                GSTR-2B reconciliation
              </CardTitle>
              <CardDescription>
                Import portal JSON, reconcile purchase bills for the return
                period, and accept or reject ITC before filing GSTR-3B
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1.5">
                  <Label>Period start</Label>
                  <DatePicker
                    onChange={setReconPeriodStart}
                    value={reconPeriodStart}
                    variant="toolbar"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label>Period end</Label>
                  <DatePicker
                    onChange={setReconPeriodEnd}
                    value={reconPeriodEnd}
                    variant="toolbar"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="gstr2b-file">Portal file</Label>
                <Input
                  accept=".json,.csv,.txt"
                  id="gstr2b-file"
                  onChange={handleGstr2bFile}
                  type="file"
                />
              </div>
              <Textarea
                className="min-h-40 font-mono text-xs"
                onChange={(event) => setGstr2bText(event.target.value)}
                placeholder='[{"supplierGstin":"24AAAA...","supplierInvoiceNumber":"SB-1","invoiceDate":"2026-01-06","taxableAmount":"500.00","totalGstAmount":"90.00"}]'
                value={gstr2bText}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  disabled={!companyId || gstr2bLoading}
                  onClick={runGstr2bReconciliation}
                  type="button"
                >
                  Reconcile
                </Button>
              </div>
              {gstr2bReport ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Matched</p>
                      <p className="text-lg font-semibold">
                        {gstr2bReport.summary.matchedCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Mismatched</p>
                      <p className="text-lg font-semibold">
                        {gstr2bReport.summary.mismatchedCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Missing in books
                      </p>
                      <p className="text-lg font-semibold">
                        {gstr2bReport.summary.missingInBooksCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Missing in 2B
                      </p>
                      <p className="text-lg font-semibold">
                        {gstr2bReport.summary.missingIn2bCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Conflicts</p>
                      <p className="text-lg font-semibold">
                        {gstr2bReport.summary.conflictCount}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">2B ITC</p>
                      <p className="text-lg font-semibold">
                        {formatInr(gstr2bReport.summary.portalItcTotal)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        Claimable ITC
                      </p>
                      <p className="text-lg font-semibold">
                        {formatInr(gstr2bReport.summary.claimableItcTotal)}
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>GSTIN</TableHead>
                        <TableHead>Books GST</TableHead>
                        <TableHead>2B GST</TableHead>
                        <TableHead>CGST / SGST / IGST (2B)</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>ITC</TableHead>
                        <TableHead />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gstr2bReport.rows.map((row) => (
                        <TableRow key={row.rowKey}>
                          <TableCell className="font-medium">
                            {row.supplierInvoiceNumber}
                          </TableCell>
                          <TableCell>{row.invoiceDate ?? '—'}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.supplierGstin ?? '—'}
                          </TableCell>
                          <TableCell>
                            {row.bookTotalGstAmount
                              ? formatInr(row.bookTotalGstAmount)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            {row.portalTotalGstAmount
                              ? formatInr(row.portalTotalGstAmount)
                              : '—'}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.portalCgstAmount
                              ? `${formatInr(row.portalCgstAmount)} / ${formatInr(row.portalSgstAmount ?? 0)} / ${formatInr(row.portalIgstAmount ?? 0)}`
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={gstReconciliationBadgeIntent(row.status)}
                            >
                              {row.status.replaceAll('_', ' ')}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                row.itcStatus === 'accepted'
                                  ? 'default'
                                  : row.itcStatus === 'rejected'
                                    ? 'destructive'
                                    : 'secondary'
                              }
                            >
                              {row.itcStatus}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {row.status === 'matched' &&
                              row.portalTotalGstAmount ? (
                                <>
                                  <Button
                                    disabled={gstr2bItcMutation.isPending}
                                    onClick={() =>
                                      setGstr2bItcStatus(row.rowKey, 'accepted')
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Accept
                                  </Button>
                                  <Button
                                    disabled={gstr2bItcMutation.isPending}
                                    onClick={() =>
                                      setGstr2bItcStatus(row.rowKey, 'rejected')
                                    }
                                    size="sm"
                                    type="button"
                                    variant="outline"
                                  >
                                    Reject
                                  </Button>
                                </>
                              ) : null}
                              {row.status === 'missing_in_books' ? (
                                <Button
                                  onClick={() => {
                                    storeGstr2bPurchasePrefill({
                                      supplierGstin: row.supplierGstin ?? undefined,
                                      supplierBillNumber: row.supplierInvoiceNumber,
                                      billDate: row.invoiceDate ?? undefined,
                                      taxableAmount:
                                        row.portalTaxableAmount ?? undefined,
                                    })
                                    void navigate({ to: '/app/purchases/new' })
                                  }}
                                  size="sm"
                                  type="button"
                                  variant="outline"
                                >
                                  Create bill
                                </Button>
                              ) : null}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : null}
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
                  <p className="text-xs text-muted-foreground">
                    Sales invoices
                  </p>
                  <p className="text-lg font-semibold">
                    {exportQuery.data?.salesInvoices.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Purchase bills
                  </p>
                  <p className="text-lg font-semibold">
                    {exportQuery.data?.purchaseBills.length ?? 0}
                  </p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-xs text-muted-foreground">
                    Trial balance rows
                  </p>
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
