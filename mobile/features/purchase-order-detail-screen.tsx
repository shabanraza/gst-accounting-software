import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { CardRow } from '@/components/data/card-row'
import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton } from '@/components/ui/button'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function PurchaseOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, godowns } = useWorkspace()

  const orderQuery = useQuery({
    queryKey: ['purchase-order', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async () => {
      const orders = await trpcClient.purchaseOrders.list.query({
        companyId: companyId!,
      })
      return orders.find((order) => order.id === id) ?? null
    },
  })

  const receiveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !orderQuery.data) {
        throw new Error('Order not loaded')
      }

      return trpcClient.purchaseGrns.receiveFromPurchaseOrder.mutate({
        companyId,
        purchaseOrderId: orderQuery.data.id,
        grnNumber: `GRN-${Date.now()}`,
        grnDate: new Date().toISOString().slice(0, 10),
        godownName: godowns[0]?.name,
      })
    },
    onSuccess: async (grn) => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchase-grns'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchase-orders'],
      })
      router.push(`/(app)/purchase-grns/${grn.id}` as never)
    },
  })

  const order = orderQuery.data

  if (orderQuery.isLoading) {
    return (
      <Screen title="Purchase order">
        <LoadingState />
      </Screen>
    )
  }

  if (!order) {
    return (
      <Screen title="Purchase order">
        <EmptyState message="Purchase order not found or unavailable." />
      </Screen>
    )
  }

  return (
    <Screen title={order.orderNumber} subtitle="Purchase order">
      <DetailCard title="Summary" icon="information-circle-outline">
        <DetailRow label="Date" value={formatShortDate(order.orderDate)} />
        <DetailRow label="Status" value={order.status} />
        <DetailRow label="Total" value={formatInr(order.totalAmount)} />
        {order.narration ? (
          <DetailRow label="Note" value={order.narration} />
        ) : null}
      </DetailCard>

      <View className="gap-section-header">
        <SectionHeader title="Lines" compact icon="list-outline" />
        {order.lines.map((line) => (
          <CardRow
            key={line.id}
            title={line.description}
            subtitle={`${line.quantity} ${line.unit} @ ${formatInr(line.rate)}`}
            amount={formatInr(line.lineTotal)}
            badge={`GST ${line.gstRate}%`}
          />
        ))}
      </View>

      {order.status === 'open' ? (
        <PrimaryButton
          label={receiveMutation.isPending ? 'Receiving…' : 'Receive goods (GRN)'}
          loading={receiveMutation.isPending}
          disabled={receiveMutation.isPending}
          onPress={() => receiveMutation.mutate()}
        />
      ) : null}

      {receiveMutation.error ? (
        <Text className="text-sm text-destructive">
          {receiveMutation.error instanceof Error
            ? receiveMutation.error.message
            : 'Unable to receive goods.'}
        </Text>
      ) : null}
    </Screen>
  )
}
