import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { EmptyState, LoadingState, Screen } from '@/components/screen'
import { ItemFormScreen } from '@/features/item-form-screen'
import { itemFormFromRecord } from '@/lib/item-form'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export default function EditItemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId } = useWorkspace()

  const itemQuery = useQuery({
    queryKey: ['item-detail', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async () => {
      const items = await trpcClient.inventory.listItems.query({
        companyId: companyId!,
      })
      const item = items.find((entry) => entry.id === id)
      if (!item) {
        throw new Error('Item not found')
      }
      return item
    },
  })

  if (itemQuery.isLoading) {
    return (
      <Screen title="Edit item">
        <LoadingState />
      </Screen>
    )
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <Screen title="Edit item">
        <EmptyState message="Item not found or unavailable." />
      </Screen>
    )
  }

  return (
    <ItemFormScreen
      mode="edit"
      itemId={id}
      initialForm={itemFormFromRecord(itemQuery.data)}
    />
  )
}
