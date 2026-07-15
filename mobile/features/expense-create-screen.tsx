import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
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
import { Text, View } from '@/tw'
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
    <Screen title="New expense" subtitle="Record a business expense" keyboardAvoiding>
      <View className="gap-section-header">
        <SectionHeader title="Expense" compact icon="wallet-outline" />
        <FormField
          placeholder="YYYY-MM-DD"
          value={form.expenseDate}
          onChangeText={(expenseDate) =>
            setForm((current) => ({ ...current, expenseDate }))
          }
        />
        <FormField
          placeholder="Narration"
          value={form.narration}
          onChangeText={(narration) =>
            setForm((current) => ({ ...current, narration }))
          }
        />
        <FormField
          keyboardType="decimal-pad"
          placeholder="Amount"
          value={form.amount}
          onChangeText={(amount) =>
            setForm((current) => ({ ...current, amount }))
          }
        />
        <PickerField
          label="Paid from"
          value={selectedPayment?.name}
          placeholder="Select account"
          onPress={() => setPaymentPickerOpen(true)}
        />
      </View>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <PrimaryButton
            label={saveMutation.isPending ? 'Posting…' : 'Post expense'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

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
