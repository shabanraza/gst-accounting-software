import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { Screen } from '@/components/layout/screen'
import { GodownFormScreen } from '@/features/godown-form-screen'
import { createInitialGodownForm } from '@/lib/godown-form'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export default function EditGodownScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId } = useWorkspace()

  const godownQuery = useQuery({
    queryKey: ['godown', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async () => {
      const godowns = await trpcClient.inventory.listGodowns.query({
        companyId: companyId!,
      })
      return godowns.find((godown) => godown.id === id) ?? null
    },
  })

  if (godownQuery.isLoading) {
    return (
      <Screen title="Edit godown">
        <LoadingState />
      </Screen>
    )
  }

  if (!godownQuery.data) {
    return (
      <Screen title="Edit godown">
        <EmptyState message="Godown not found or unavailable." />
      </Screen>
    )
  }

  return (
    <GodownFormScreen
      mode="edit"
      godownId={godownQuery.data.id}
      initialForm={createInitialGodownForm(godownQuery.data.name)}
    />
  )
}
