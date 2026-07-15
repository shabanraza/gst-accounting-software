import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import {
  usePurchaseOrders,
} from '@/features/use-purchase-masters'
import {
  buildReceiveFromPurchaseOrderInput,
  createInitialGrnForm,
  filterOpenPurchaseOrders,
  validateGrnForm,
  type GrnFormDraft,
} from '@/lib/grn-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function GrnCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, godowns } = useWorkspace()
  const ordersQuery = usePurchaseOrders()
  const [form, setForm] = React.useState<GrnFormDraft>(() =>
    createInitialGrnForm(godowns[0]?.name ?? ''),
  )
  const [poPickerOpen, setPoPickerOpen] = React.useState(false)
  const [godownPickerOpen, setGodownPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const openOrders = filterOpenPurchaseOrders(ordersQuery.data ?? [])
  const selectedOrder = openOrders.find((order) => order.id === form.purchaseOrderId)

  React.useEffect(() => {
    if (!form.purchaseOrderId && openOrders[0]) {
      setForm((current) => ({ ...current, purchaseOrderId: openOrders[0].id }))
    }
    if (!form.godownName && godowns[0]) {
      setForm((current) => ({ ...current, godownName: godowns[0].name }))
    }
  }, [form.godownName, form.purchaseOrderId, godowns, openOrders])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Workspace not ready')

      const validationError = validateGrnForm(form)
      if (validationError) throw new Error(validationError)

      const grnNumber = form.grnNumber.trim() || `GRN-${Date.now()}`

      return trpcClient.purchaseGrns.receiveFromPurchaseOrder.mutate(
        buildReceiveFromPurchaseOrderInput(form, companyId, grnNumber),
      )
    },
    onSuccess: async (grn) => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchase-grns'],
      })
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchase-orders'],
      })
      router.replace(`/(app)/purchase-grns/${grn.id}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to create GRN.',
      )
    },
  })

  return (
    <Screen title="Goods receipt" subtitle="Receive against purchase order" keyboardAvoiding>
      <View className="gap-section-header">
        <SectionHeader title="Receipt" compact icon="cube-outline" />
        <PickerField
          label="Purchase order"
          value={selectedOrder?.orderNumber}
          placeholder="Select purchase order"
          onPress={() => setPoPickerOpen(true)}
        />
        <FormField
          placeholder="GRN number (optional)"
          value={form.grnNumber}
          onChangeText={(grnNumber) =>
            setForm((current) => ({ ...current, grnNumber }))
          }
        />
        <FormField
          placeholder="YYYY-MM-DD"
          value={form.grnDate}
          onChangeText={(grnDate) =>
            setForm((current) => ({ ...current, grnDate }))
          }
        />
        <PickerField
          label="Godown"
          value={form.godownName}
          placeholder="Select godown"
          onPress={() => setGodownPickerOpen(true)}
        />
        <FormField
          placeholder="Optional note"
          value={form.narration}
          onChangeText={(narration) =>
            setForm((current) => ({ ...current, narration }))
          }
        />
      </View>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <PrimaryButton
            label={saveMutation.isPending ? 'Saving…' : 'Receive goods'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending || openOrders.length === 0}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

      <PickerModal
        visible={poPickerOpen}
        title="Purchase order"
        options={openOrders.map((order) => ({
          key: order.id,
          label: order.orderNumber,
        }))}
        onSelect={(purchaseOrderId) =>
          setForm((current) => ({ ...current, purchaseOrderId }))
        }
        onClose={() => setPoPickerOpen(false)}
      />
      <PickerModal
        visible={godownPickerOpen}
        title="Godown"
        options={godowns.map((godown) => ({
          key: godown.id,
          label: godown.name,
        }))}
        onSelect={(godownId) => {
          const godown = godowns.find((entry) => entry.id === godownId)
          if (!godown) return
          setForm((current) => ({ ...current, godownName: godown.name }))
        }}
        onClose={() => setGodownPickerOpen(false)}
      />
    </Screen>
  )
}
