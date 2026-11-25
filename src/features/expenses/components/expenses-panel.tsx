import * as React from 'react'
import {
  skipToken,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { usePostHog } from '@posthog/react'
import { ReceiptIcon, PlusIcon } from 'lucide-react'
import Decimal from 'decimal.js'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
import { Checkbox } from '#/components/ui/checkbox.tsx'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '#/components/ui/dialog.tsx'
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
import { calculateGst } from '#/features/gst/gst-calculator.ts'
import {
  formatGstRateLabel,
  gstRateOptions,
} from '#/features/app-shell/data/india-masters.ts'
import { formatInr } from '#/lib/format-inr.ts'
import { toastActionError } from '#/features/app-shell/form-error.ts'
import {
  requirePositiveAmount,
  requireTrimmed,
  requireWorkspace,
} from '#/lib/form-validation.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function ExpensesPanel() {
  const posthog = usePostHog()
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, company, ledgerBySystemKey, isReady } = useWorkspace()
  const [open, setOpen] = React.useState(false)
  const [narration, setNarration] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [expenseDate, setExpenseDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [paymentAccountId, setPaymentAccountId] = React.useState('')
  const [gstRate, setGstRate] = React.useState('0.00')
  const [supplierName, setSupplierName] = React.useState('')
  const [supplierGstin, setSupplierGstin] = React.useState('')
  const [billNumber, setBillNumber] = React.useState('')
  const [claimItc, setClaimItc] = React.useState(true)
  const hasGst = Number(gstRate) > 0
  let gstPreview: { gst: string; total: string } | null = null
  try {
    const taxable = new Decimal(amount.trim() || '0')
    // Same rule as the server: equal CGST/SGST halves within the state.
    const gst = company?.stateCode
      ? new Decimal(
          calculateGst({
            taxableAmount: taxable.toString(),
            gstRate,
            companyStateCode: company.stateCode,
            partyStateCode:
              supplierGstin.trim().slice(0, 2) || company.stateCode,
          }).totalGstAmount,
        )
      : taxable.times(gstRate).div(100).toDecimalPlaces(2)
    gstPreview = { gst: gst.toFixed(2), total: taxable.plus(gst).toFixed(2) }
  } catch {
    gstPreview = null
  }

  const expensesQuery = useQuery(
    trpc.expenses.list.queryOptions(
      companyId && isReady ? { companyId } : skipToken,
    ),
  )
  const ledgersQuery = useQuery(
    trpc.accounting.listLedgerAccounts.queryOptions(
      companyId && isReady ? { companyId } : skipToken,
    ),
  )
  const postExpense = useMutation(trpc.expenses.post.mutationOptions())

  const expenseAccountId = ledgerBySystemKey.expenses
  const paymentAccounts = (ledgersQuery.data ?? []).filter(
    (account) => account.systemKey === 'cash' || account.systemKey === 'bank',
  )

  React.useEffect(() => {
    if (!paymentAccountId && paymentAccounts[0]) {
      setPaymentAccountId(paymentAccounts[0].id)
    }
  }, [paymentAccountId, paymentAccounts])

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    if (!requireWorkspace(companyId, isReady)) return
    if (!expenseAccountId || !paymentAccountId) {
      toast.error('Workspace or expense ledgers are not ready yet.')
      return
    }

    const expenseNarration = requireTrimmed(narration, 'Narration')
    if (!expenseNarration) return

    const expenseAmount = requirePositiveAmount(amount, 'Amount')
    if (!expenseAmount) return

    try {
      await postExpense.mutateAsync({
        companyId,
        expenseDate,
        narration: expenseNarration,
        amount: expenseAmount,
        expenseAccountId,
        paymentAccountId,
        gstRate,
        supplierName: hasGst ? supplierName.trim() : '',
        supplierGstin: hasGst ? supplierGstin.trim() : '',
        billNumber: hasGst ? billNumber.trim() : '',
        claimItc: hasGst && claimItc,
        companyStateCode: company?.stateCode,
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.expenses.list.queryKey({ companyId }),
      })
      posthog.capture('expense_posted')
      setOpen(false)
      setNarration('')
      setAmount('')
      setGstRate('0.00')
      setSupplierName('')
      setSupplierGstin('')
      setBillNumber('')
      setClaimItc(true)
      toast.success('Expense posted')
    } catch (err) {
      toastActionError(err, 'Failed to post expense')
    }
  }

  return (
    <WorkspacePage
      actions={
        <Dialog onOpenChange={setOpen} open={open}>
          <DialogTrigger asChild>
            <Button>
              <PlusIcon data-icon="inline-start" />
              New expense
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Expense voucher</DialogTitle>
              <DialogDescription>
                Records the expense and the cash or bank it was paid from.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <Label className="text-sm" htmlFor="exp-narr">
                  Narration
                </Label>
                <Input
                  id="exp-narr"
                  onChange={(event) => setNarration(event.target.value)}
                  required
                  value={narration}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm" htmlFor="exp-amt">
                    {hasGst ? 'Amount before GST' : 'Amount'}
                  </Label>
                  <Input
                    id="exp-amt"
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    value={amount}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label className="text-sm" htmlFor="exp-date">
                    Date
                  </Label>
                  <DatePicker
                    id="exp-date"
                    onChange={setExpenseDate}
                    required
                    value={expenseDate}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">GST rate</span>
                <Select onValueChange={setGstRate} value={gstRate}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {gstRateOptions.map((rate) => (
                        <SelectItem key={rate} value={rate}>
                          {formatGstRateLabel(rate)}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {hasGst ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm" htmlFor="exp-supplier">
                        Supplier
                      </Label>
                      <Input
                        id="exp-supplier"
                        onChange={(event) =>
                          setSupplierName(event.target.value)
                        }
                        value={supplierName}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-sm" htmlFor="exp-bill">
                        Bill number
                      </Label>
                      <Input
                        id="exp-bill"
                        onChange={(event) => setBillNumber(event.target.value)}
                        value={billNumber}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-sm" htmlFor="exp-gstin">
                      Supplier GSTIN
                    </Label>
                    <Input
                      className="font-mono uppercase"
                      id="exp-gstin"
                      maxLength={15}
                      onChange={(event) => setSupplierGstin(event.target.value)}
                      value={supplierGstin}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={claimItc}
                      id="exp-itc"
                      onCheckedChange={(checked) =>
                        setClaimItc(checked === true)
                      }
                    />
                    <Label className="font-normal" htmlFor="exp-itc">
                      Claim input tax credit
                    </Label>
                  </div>
                  {gstPreview ? (
                    <dl
                      className="grid grid-cols-2 gap-1 text-sm"
                      data-ui="data"
                    >
                      <dt className="text-muted-foreground">GST</dt>
                      <dd className="text-right font-mono tabular-nums">
                        {formatInr(gstPreview.gst)}
                      </dd>
                      <dt className="font-medium">Total paid</dt>
                      <dd className="text-right font-mono font-medium tabular-nums">
                        {formatInr(gstPreview.total)}
                      </dd>
                    </dl>
                  ) : null}
                </>
              ) : null}
              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Paid from</span>
                <Select
                  onValueChange={setPaymentAccountId}
                  value={paymentAccountId}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {paymentAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit">Post expense</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      }
      description="Day-to-day business expenses paid by cash or bank."
      title="Expenses"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptIcon className="size-4 text-muted-foreground" />
            Expense register
          </CardTitle>
          <CardDescription>
            {(expensesQuery.data ?? []).length} expenses
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Narration</TableHead>
                <TableHead className="hidden text-right sm:table-cell">
                  GST
                </TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expensesQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={4}
                  >
                    No expenses yet.
                  </TableCell>
                </TableRow>
              ) : (
                (expensesQuery.data ?? []).map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.expenseDate}</TableCell>
                    <TableCell className="font-medium">
                      {row.narration}
                    </TableCell>
                    <TableCell className="hidden text-right font-mono tabular-nums sm:table-cell">
                      {Number(row.gstAmount) > 0
                        ? formatInr(row.gstAmount)
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatInr(row.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </WorkspacePage>
  )
}
