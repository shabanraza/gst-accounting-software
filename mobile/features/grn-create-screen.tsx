import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { CardRow } from '@/components/data/card-row'
import { CreateScreenFooter } from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { DateField } from '@/components/ui/date-field'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
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
import { formatInr } from '@/lib/format-inr'
import {
  useFormPickerCoordination,
} from '@/lib/form-picker-coordination'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function GrnCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, godowns } = useWorkspace()
  const ordersQuery = usePurchaseOrders()
  const [form, setForm] = React.useState<GrnFormDraft>(() =>
    createInitialGrnForm(godowns[0]?.name ?? ''),
  )
  const pickers = useFormPickerCoordination(['po', 'godown'] as const)
  const [error, setError] = React.useState<string | null>(null)

  const openOrders = filterOpenPurchaseOrders(ordersQuery.data ?? [])
  const selectedOrder = openOrders.find((order) => order.id === form.purchaseOrderId)
  const selectedOrderLines = selectedOrder?.lines ?? []

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
      <Screen
        title="Goods receipt"
        subtitle="Receive against purchase order"
        keyboardAvoiding
        footer={
            <CreateScreenFooter
              error={error}
              loading={saveMutation.isPending}
              onCancel={() => router.back()}
              onSubmit={() => saveMutation.mutate()}
              submitLabel="Receive goods"
            />
        }
      >
      <FormSection title="Receipt" icon="cube-outline">
        <PickerField
          label="Purchase order"
          value={selectedOrder?.orderNumber}
          placeholder="Select purchase order"
          onPress={() => pickers.open('po')}
        />
        <DateField
          label="Receipt date"
          value={form.grnDate}
          onChange={(grnDate) =>
            setForm((current) => ({ ...current, grnDate }))
          }
        />
        <CollapsibleSection
          defaultOpen={false}
          filledCount={
            (form.grnNumber.trim() ? 1 : 0) +
            (form.godownName && form.godownName !== godowns[0]?.name ? 1 : 0) +
            (form.narration.trim() ? 1 : 0)
          }
          title="References"
        >
          <FormFieldGroup label="GRN number">
            <FormField
              placeholder="Auto if blank"
              value={form.grnNumber}
              onChangeText={(grnNumber) =>
                setForm((current) => ({ ...current, grnNumber }))
              }
            />
          </FormFieldGroup>
          <PickerField
            label="Godown"
            value={form.godownName}
            onPress={() => pickers.open('godown')}
          />
          <FormFieldGroup label="Note">
            <FormField
              placeholder="Optional"
              value={form.narration}
              onChangeText={(narration) =>
                setForm((current) => ({ ...current, narration }))
              }
            />
          </FormFieldGroup>
        </CollapsibleSection>
      </FormSection>

      {selectedOrder && selectedOrderLines.length > 0 ? (
        <FormSection title="Receiving" icon="list-outline">
          <View className="gap-3">
            {selectedOrderLines.map((line) => (
              <CardRow
                key={line.id}
                title={line.description}
                subtitle={`${line.quantity} ${line.unit} @ ${formatInr(line.rate)}`}
                amount={formatInr(line.lineTotal)}
                badge={`GST ${line.gstRate}%`}
              />
            ))}
          </View>
        </FormSection>
      ) : null}

      <PickerModal
        visible={pickers.isOpen('po')}
        title="Purchase order"
        options={openOrders.map((order) => ({
          key: order.id,
          label: order.orderNumber,
        }))}
        onSelect={(purchaseOrderId) =>
          setForm((current) => ({ ...current, purchaseOrderId }))
        }
        onClose={pickers.closeAll}
      />
      <PickerModal
        visible={pickers.isOpen('godown')}
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
        onClose={pickers.closeAll}
      />
    </Screen>
  )
}
