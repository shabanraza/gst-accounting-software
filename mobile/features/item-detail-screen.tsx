import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { formatInr } from '@/lib/format-inr'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function ItemDetailScreen() {
  const router = useRouter()
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

  const item = itemQuery.data

  if (itemQuery.isLoading) {
    return (
      <Screen title="Item">
        <LoadingState />
      </Screen>
    )
  }

  if (itemQuery.isError || !item) {
    return (
      <Screen title="Item">
        <EmptyState message="Item not found or unavailable." />
      </Screen>
    )
  }

  return (
    <Screen title={item.name} subtitle={item.itemGroup || 'Item master'}>
      <View className="gap-section-header">
        <DetailCard title="Basics" icon="cube-outline">
          <DetailRow label="Alias" value={item.alias?.trim() || '—'} />
          <DetailRow label="HSN" value={item.hsnCode} />
          <DetailRow label="GST rate" value={`${item.gstRate}%`} />
          <DetailRow label="Base unit" value={item.baseUnit} />
        </DetailCard>

        <DetailCard title="Rates" icon="pricetag-outline">
          <DetailRow label="Purchase" value={formatInr(item.purchaseRate)} />
          <DetailRow label="Sale" value={formatInr(item.saleRate)} />
        </DetailCard>

        <DetailCard title="Inventory" icon="layers-outline">
          <DetailRow
            label="Tracks inventory"
            value={item.tracksInventory ? 'Yes' : 'No'}
          />
        </DetailCard>
      </View>

      <PrimaryButton
        label="Edit item"
        onPress={() => router.push(`/(app)/items/${item.id}/edit` as never)}
      />
      <SecondaryButton label="Back" onPress={() => router.back()} />
    </Screen>
  )
}
