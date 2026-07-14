import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ReceiptIcon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '#/components/ui/button.tsx'
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
import {
  requirePositiveAmount,
  requireTrimmed,
  requireWorkspace,
} from '#/lib/form-validation.ts'
import { useTRPC } from '#/integrations/trpc/react.ts'

export function ExpensesPanel() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady } = useWorkspace()
  const [open, setOpen] = React.useState(false)
  const [narration, setNarration] = React.useState('')
  const [amount, setAmount] = React.useState('')
  const [expenseDate, setExpenseDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  )
  const [paymentAccountId, setPaymentAccountId] = React.useState('')

  const expensesQuery = useQuery({
    ...trpc.expenses.list.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const ledgersQuery = useQuery({
    ...trpc.accounting.listLedgerAccounts.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady,
  })
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
      })
      await queryClient.invalidateQueries({
        queryKey: trpc.expenses.list.queryKey({ companyId }),
      })
      setOpen(false)
      setNarration('')
      setAmount('')
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
                Debits Expenses and credits Cash/Bank through the ledger engine.
              </DialogDescription>
            </DialogHeader>
            <form className="flex flex-col gap-4" onSubmit={handleCreate}>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium" htmlFor="exp-narr">
                  Narration
                </label>
                <Input
                  id="exp-narr"
                  onChange={(event) => setNarration(event.target.value)}
                  required
                  value={narration}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="exp-amt">
                    Amount
                  </label>
                  <Input
                    id="exp-amt"
                    onChange={(event) => setAmount(event.target.value)}
                    required
                    value={amount}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" htmlFor="exp-date">
                    Date
                  </label>
                  <DatePicker
                    id="exp-date"
                    onChange={setExpenseDate}
                    required
                    value={expenseDate}
                  />
                </div>
              </div>
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
      description="Operating expenses posted through double-entry ledger."
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
                <TableHead>Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(expensesQuery.data ?? []).length === 0 ? (
                <TableRow>
                  <TableCell
                    className="py-10 text-center text-muted-foreground"
                    colSpan={3}
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
                    <TableCell>{formatInr(row.amount)}</TableCell>
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
