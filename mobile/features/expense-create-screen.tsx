import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { CreateScreenFooter } from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { DateField } from '@/components/ui/date-field'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { useLedgerAccounts } from '@/features/use-ledger-accounts'
import {
  buildPostExpenseInput,
  createInitialExpenseForm,
  filterPaymentAccounts,
  validateExpenseForm,
  type ExpenseFormDraft,
} from '@/lib/expense-form'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export function ExpenseCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey } = useWorkspace()
  const ledgersQuery = useLedgerAccounts()
  const [form, setForm] = React.useState<ExpenseFormDraft>(createInitialExpenseForm)
  const [paymentPickerOpen, setPaymentPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const paymentAccounts = filterPaymentAccounts(ledgersQuery.data ?? [])
  const selectedPayment = paymentAccounts.find(
    (account) => account.id === form.paymentAccountId,
  )
  const expenseAccountId = ledgerBySystemKey.expenses

  React.useEffect(() => {
    if (!form.paymentAccountId && paymentAccounts[0]) {
      setForm((current) => ({
        ...current,
        paymentAccountId: paymentAccounts[0].id,
      }))
    }
  }, [form.paymentAccountId, paymentAccounts])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Workspace not ready')

      const validationError = validateExpenseForm(form, expenseAccountId)
      if (validationError) throw new Error(validationError)

      return trpcClient.expenses.post.mutate(
        buildPostExpenseInput(form, companyId, expenseAccountId!),
      )
    },
    onSuccess: async (expense) => {
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'expenses'] })
      router.replace(`/(app)/expenses/${expense.id}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post expense.',
      )
    },
  })

  return (
    <Screen
      title="New expense"
      subtitle="Record a business expense"
      keyboardAvoiding
      footer={
        <CreateScreenFooter
          error={error}
          loading={saveMutation.isPending}
          onCancel={() => router.back()}
          onSubmit={() => saveMutation.mutate()}
          submitLabel="Post expense"
        />
      }
    >
      <FormSection title="Expense" icon="wallet-outline">
        <DateField
          label="Date"
          value={form.expenseDate}
          onChange={(expenseDate) =>
            setForm((current) => ({ ...current, expenseDate }))
          }
        />
        <FormFieldGroup label="Narration">
          <FormField
            placeholder="What was this expense for?"
            value={form.narration}
            onChangeText={(narration) =>
              setForm((current) => ({ ...current, narration }))
            }
          />
        </FormFieldGroup>
        <FormFieldGroup label="Amount">
          <FormField
            keyboardType="decimal-pad"
            placeholder="0.00"
            value={form.amount}
            onChangeText={(amount) =>
              setForm((current) => ({ ...current, amount }))
            }
          />
        </FormFieldGroup>
        <PickerField
          label="Paid from"
          value={selectedPayment?.name}
          placeholder="Select account"
          onPress={() => setPaymentPickerOpen(true)}
        />
      </FormSection>

      <PickerModal
        visible={paymentPickerOpen}
        title="Payment account"
        options={paymentAccounts.map((account) => ({
          key: account.id,
          label: account.name,
        }))}
        onSelect={(paymentAccountId) =>
          setForm((current) => ({ ...current, paymentAccountId }))
        }
        onClose={() => setPaymentPickerOpen(false)}
      />
    </Screen>
  )
}
