import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { SectionHeader } from '@/components/section-header'
import {
  EmptyState,
  LoadingState,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/screen'
import { formatInr } from '@/lib/format-inr'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="shrink text-right text-sm font-medium text-foreground">
        {value}
      </Text>
    </View>
  )
}

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
        <SectionHeader title="Basics" compact icon="cube-outline" />
        <View className="rounded-xl border border-border bg-card p-card-padding">
          <DetailRow label="Alias" value={item.alias?.trim() || '—'} />
          <DetailRow label="HSN" value={item.hsnCode} />
          <DetailRow label="GST rate" value={`${item.gstRate}%`} />
          <DetailRow label="Base unit" value={item.baseUnit} />
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Rates" compact icon="pricetag-outline" />
        <View className="rounded-xl border border-border bg-card p-card-padding">
          <DetailRow label="Purchase" value={formatInr(item.purchaseRate)} />
          <DetailRow label="Sale" value={formatInr(item.saleRate)} />
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Inventory" compact icon="layers-outline" />
        <View className="rounded-xl border border-border bg-card p-card-padding">
          <DetailRow
            label="Tracks inventory"
            value={item.tracksInventory ? 'Yes' : 'No'}
          />
        </View>
      </View>

      <PrimaryButton
        label="Edit item"
        onPress={() => router.push(`/(app)/items/${item.id}/edit` as never)}
      />
      <SecondaryButton label="Back" onPress={() => router.back()} />
    </Screen>
  )
}
