import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckIcon, UploadIcon, WandSparklesIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Badge } from '#/components/ui/badge.tsx'
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
import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '#/components/ui/table.tsx'
import { WorkspacePage } from '#/features/app-shell/components/workspace-page.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { formatInr } from '#/features/app-shell/data/voucher-demo-masters.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import { requireWorkspace } from '#/lib/form-validation.ts'
import { localCalendarDate } from '#/lib/calendar-date.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

function statusBadge(status: string) {
  if (status === 'matched') return 'success' as const
  if (status === 'unmatched_book') return 'warning' as const
  return 'secondary' as const
}

function statusLabel(status: string) {
  if (status === 'matched') return 'Matched'
  if (status === 'unmatched_book') return 'In books only'
  return 'In statement only'
}

export function BankReconciliationPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, isReady } = useWorkspace()
  const today = localCalendarDate()
  const monthStart = `${today.slice(0, 7)}-01`

  const ledgersQuery = useQuery({
    ...trpc.accounting.listLedgerAccounts.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const bankAccounts = React.useMemo(
    () =>
      (ledgersQuery.data ?? []).filter(
        (account) =>
          account.systemKey === 'bank' || account.systemKey === 'cash',
      ),
    [ledgersQuery.data],
  )

  const [ledgerAccountId, setLedgerAccountId] = React.useState('')
  const [periodStart, setPeriodStart] = React.useState(monthStart)
  const [periodEnd, setPeriodEnd] = React.useState(today)
  const [statementId, setStatementId] = React.useState<string | undefined>()
  const [csvText, setCsvText] = React.useState('')

  React.useEffect(() => {
    if (!ledgerAccountId && bankAccounts[0]) {
      setLedgerAccountId(bankAccounts[0].id)
    }
  }, [bankAccounts, ledgerAccountId])

  const resolvedCompanyId = companyId ?? ''
  const queryEnabled =
    Boolean(companyId) && isReady && Boolean(ledgerAccountId)

  const reconciliationQuery = useQuery({
    ...trpc.banking.getReconciliation.queryOptions({
      companyId: resolvedCompanyId,
      ledgerAccountId,
      periodStart,
      periodEnd,
      statementId,
    }),
    enabled: queryEnabled,
  })

  const statementsQuery = useQuery({
    ...trpc.banking.listStatements.queryOptions({
      companyId: resolvedCompanyId,
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const importMutation = useMutation({
    ...trpc.banking.importStatement.mutationOptions(),
    onSuccess: (statement) => {
      setStatementId(statement.id)
      void queryClient.invalidateQueries({
        queryKey: trpc.banking.listStatements.queryKey(),
      })
      void queryClient.invalidateQueries({
        queryKey: trpc.banking.getReconciliation.queryKey(),
      })
      toast.success('Bank statement imported')
    },
    onError: (error) => {
      toastActionError(error, 'Failed to import bank statement')
    },
  })

  const autoMatchMutation = useMutation({
    ...trpc.banking.autoMatch.mutationOptions(),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({
        queryKey: trpc.banking.getReconciliation.queryKey(),
      })
      toast.success(`Matched ${result.matched} line(s)`)
    },
    onError: (error) => {
      toastActionError(error, 'Auto-match failed')
    },
  })

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    setCsvText(await file.text())
  }

  function handleImport() {
    const resolved = requireWorkspace(companyId)
    if (!ledgerAccountId) {
      toast.error('Select a bank account')
      return
    }
    if (!csvText.trim()) {
      toast.error('Upload a CSV bank statement first')
      return
    }

    importMutation.mutate({
      companyId: resolved,
      ledgerAccountId,
      periodStart,
      periodEnd,
      sourceFilename: 'bank-statement.csv',
      csvText,
    })
  }

  function handleAutoMatch() {
    const resolved = requireWorkspace(companyId)
    if (!statementId) {
      toast.error('Import a bank statement first')
      return
    }

    autoMatchMutation.mutate({
      companyId: resolved,
      ledgerAccountId,
      statementId,
      periodStart,
      periodEnd,
    })
  }

  const report = reconciliationQuery.data
  const selectedAccount = bankAccounts.find(
    (account) => account.id === ledgerAccountId,
  )

  return (
    <WorkspacePage
      description="Match bank statement lines with cash book entries."
      title="Bank reconciliation"
    >
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statement import</CardTitle>
            <CardDescription>
              CSV columns: Date, Description, Debit, Credit (or Amount).
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bank-account">Bank / cash account</Label>
                <Select
                  onValueChange={setLedgerAccountId}
                  value={ledgerAccountId}
                >
                  <SelectTrigger id="bank-account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.code} · {account.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Period from</Label>
                <DatePicker
                  onChange={setPeriodStart}
                  value={periodStart}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Period to</Label>
                <DatePicker onChange={setPeriodEnd} value={periodEnd} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="bank-csv">Statement CSV</Label>
                <Input
                  accept=".csv,.txt,.tsv"
                  id="bank-csv"
                  onChange={(event) => void handleFileChange(event)}
                  type="file"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={importMutation.isPending}
                onClick={handleImport}
                type="button"
              >
                <UploadIcon data-icon="inline-start" />
                Import statement
              </Button>
              <Button
                disabled={autoMatchMutation.isPending || !statementId}
                onClick={handleAutoMatch}
                type="button"
                variant="secondary"
              >
                <WandSparklesIcon data-icon="inline-start" />
                Auto-match
              </Button>
            </div>
            {statementsQuery.data && statementsQuery.data.length > 0 ? (
              <p className="text-sm text-muted-foreground">
                Latest import:{' '}
                {statementsQuery.data
                  .filter((entry) => entry.ledgerAccountId === ledgerAccountId)
                  .sort(
                    (left, right) =>
                      right.importedAt.getTime() - left.importedAt.getTime(),
                  )[0]?.sourceFilename ?? '—'}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selectedAccount?.name ?? 'Reconciliation'} · {periodStart} to{' '}
              {periodEnd}
            </CardTitle>
            <CardDescription>
              {report
                ? `${report.matchedCount} matched · ${report.unmatchedStatementCount} statement only · ${report.unmatchedBookCount} books only`
                : 'Import a statement to begin matching.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Stmt date</TableHead>
                  <TableHead>Statement</TableHead>
                  <TableHead>Book date</TableHead>
                  <TableHead>Books</TableHead>
                  <TableHead className="text-right">Stmt</TableHead>
                  <TableHead className="text-right">Book</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reconciliationQuery.isLoading ? (
                  <TableRow>
                    <TableCell className="py-8 text-center" colSpan={7}>
                      Loading reconciliation…
                    </TableCell>
                  </TableRow>
                ) : !report || report.rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      className="py-8 text-center text-muted-foreground"
                      colSpan={7}
                    >
                      No reconciliation rows yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  report.rows.map((row, index) => {
                    const statementAmount =
                      Number(row.statementCredit) > 0
                        ? row.statementCredit
                        : row.statementDebit
                    const bookAmount =
                      Number(row.bookDebit) > 0 ? row.bookDebit : row.bookCredit

                    return (
                      <TableRow key={`${row.matchId ?? 'row'}-${index}`}>
                        <TableCell>
                          <Badge variant={statusBadge(row.status)}>
                            {row.status === 'matched' ? (
                              <CheckIcon data-icon="inline-start" />
                            ) : null}
                            {statusLabel(row.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{row.statementDate ?? '—'}</TableCell>
                        <TableCell className="max-w-48 truncate">
                          {row.statementDescription ?? '—'}
                        </TableCell>
                        <TableCell>{row.bookDate ?? '—'}</TableCell>
                        <TableCell className="max-w-48 truncate">
                          {row.bookNarration ?? '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {statementAmount
                            ? formatInr(statementAmount)
                            : '—'}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {bookAmount ? formatInr(bookAmount) : '—'}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </WorkspacePage>
  )
}
