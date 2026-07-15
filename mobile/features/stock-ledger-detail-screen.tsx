import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { randomId } from '@/lib/random-id'
import {
  buildRecordStockMovementInput,
  createInitialStockAdjustmentForm,
  validateStockAdjustmentForm,
} from '@/lib/stock-adjustment-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function StockLedgerDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const [adjustmentOpen, setAdjustmentOpen] = React.useState(false)
  const [adjustmentForm, setAdjustmentForm] = React.useState(
    createInitialStockAdjustmentForm,
  )
  const [adjustmentError, setAdjustmentError] = React.useState<string | null>(
    null,
  )

  const ledgerQuery = useQuery({
    queryKey: ['stock-ledger', companyId, itemId],
    enabled: Boolean(companyId && itemId),
    queryFn: () =>
      trpcClient.reports.stockLedger.query({
        companyId: companyId!,
        itemId: itemId!,
      }),
  })

  const itemsQuery = useQuery({
    queryKey: ['stock-ledger-item', companyId, itemId],
    enabled: Boolean(companyId && itemId),
    queryFn: async () => {
      const items = await trpcClient.inventory.listItems.query({
        companyId: companyId!,
      })
      return items.find((item) => item.id === itemId) ?? null
    },
  })

  const adjustmentMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !itemId) throw new Error('Item not loaded')

      const form = {
        ...adjustmentForm,
        itemId,
        unit: adjustmentForm.unit || itemsQuery.data?.baseUnit || '',
      }

      const validationError = validateStockAdjustmentForm(form)
      if (validationError) throw new Error(validationError)

      return trpcClient.inventory.recordStockMovement.mutate(
        buildRecordStockMovementInput(form, companyId, randomId()),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['stock-ledger', companyId, itemId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'inventory'],
      })
      setAdjustmentOpen(false)
      setAdjustmentForm(createInitialStockAdjustmentForm())
      setAdjustmentError(null)
    },
    onError: (mutationError) => {
      setAdjustmentError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to record adjustment.',
      )
    },
  })

  const item = itemsQuery.data
  const movements = ledgerQuery.data?.rows ?? []

  if (ledgerQuery.isLoading || itemsQuery.isLoading) {
    return (
      <Screen title="Stock ledger">
        <LoadingState />
      </Screen>
    )
  }

  if (!item) {
    return (
      <Screen title="Stock ledger">
        <EmptyState message="Item not found or unavailable." />
      </Screen>
    )
  }

  return (
    <Screen title={item.name} subtitle="Stock movements">
      <View className="gap-section-header">
        <SectionHeader title="Movements" compact icon="layers-outline" />
        {movements.length === 0 ? (
          <EmptyState message="No stock movements yet." />
        ) : (
          movements.map((movement) => (
            <CardRow
              key={movement.movementId}
              title={movement.movementType}
              subtitle={`${formatShortDate(movement.occurredOn)} · ${movement.direction}`}
              amount={`${movement.quantity} ${item.baseUnit}`}
            />
          ))
        )}
      </View>

      {!adjustmentOpen ? (
        <PrimaryButton
          label="Stock adjustment"
          onPress={() => {
            setAdjustmentForm((current) => ({
              ...current,
              itemId: item.id,
              unit: item.baseUnit,
            }))
            setAdjustmentOpen(true)
          }}
        />
      ) : (
        <View className="gap-section-header">
          <SectionHeader title="Adjustment" compact icon="create-outline" />
          <FormField
            placeholder="YYYY-MM-DD"
            value={adjustmentForm.occurredOn}
            onChangeText={(occurredOn) =>
              setAdjustmentForm((current) => ({ ...current, occurredOn }))
            }
          />
          <FormField
            keyboardType="decimal-pad"
            placeholder="Quantity (+ in / - out)"
            value={adjustmentForm.quantity}
            onChangeText={(quantity) =>
              setAdjustmentForm((current) => ({ ...current, quantity }))
            }
          />
          {adjustmentError ? (
            <Text className="text-sm text-destructive">{adjustmentError}</Text>
          ) : null}
          <PrimaryButton
            label={adjustmentMutation.isPending ? 'Saving…' : 'Record adjustment'}
            loading={adjustmentMutation.isPending}
            disabled={adjustmentMutation.isPending}
            onPress={() => adjustmentMutation.mutate()}
          />
        </View>
      )}
    </Screen>
  )
}
