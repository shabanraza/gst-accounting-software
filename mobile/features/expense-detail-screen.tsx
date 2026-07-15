import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { Screen } from '@/components/layout/screen'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId } = useWorkspace()

  const expenseQuery = useQuery({
    queryKey: ['expense', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async () => {
      const expenses = await trpcClient.expenses.list.query({
        companyId: companyId!,
      })
      return expenses.find((expense) => expense.id === id) ?? null
    },
  })

  const expense = expenseQuery.data

  if (expenseQuery.isLoading) {
    return (
      <Screen title="Expense">
        <LoadingState />
      </Screen>
    )
  }

  if (!expense) {
    return (
      <Screen title="Expense">
        <EmptyState message="Expense not found or unavailable." />
      </Screen>
    )
  }

  return (
    <Screen title="Expense" subtitle={formatShortDate(expense.expenseDate)}>
      <DetailCard title="Summary" icon="information-circle-outline">
        <DetailRow label="Date" value={formatShortDate(expense.expenseDate)} />
        <DetailRow label="Narration" value={expense.narration} />
        <DetailRow label="Amount" value={formatInr(expense.amount)} />
      </DetailCard>
    </Screen>
  )
}
