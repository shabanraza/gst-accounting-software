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
  usePurchaseItems,
  usePurchaseParties,
} from '@/features/use-purchase-masters'
import {
  applyItemToPurchaseOrderLine,
  buildCreatePurchaseOrderInput,
  createInitialPurchaseOrderForm,
  filterSupplierParties,
  validatePurchaseOrderForm,
  type PurchaseOrderFormDraft,
} from '@/lib/purchase-order-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function PurchaseOrderCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const partiesQuery = usePurchaseParties()
  const itemsQuery = usePurchaseItems()
  const [form, setForm] = React.useState<PurchaseOrderFormDraft>(
    createInitialPurchaseOrderForm,
  )
  const [supplierPickerOpen, setSupplierPickerOpen] = React.useState(false)
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const suppliers = filterSupplierParties(partiesQuery.data ?? [])
  const items = itemsQuery.data ?? []
  const selectedSupplier = suppliers.find((party) => party.id === form.supplierId)
  const selectedItem = items.find((item) => item.id === form.line.itemId)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Workspace not ready')

      const validationError = validatePurchaseOrderForm(form)
      if (validationError) throw new Error(validationError)

      const orderNumber =
        form.orderNumber.trim() || `PO-${Date.now()}`

      return trpcClient.purchaseOrders.create.mutate(
        buildCreatePurchaseOrderInput(form, companyId, orderNumber),
      )
    },
    onSuccess: async (order) => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'purchase-orders'],
      })
      await queryClient.invalidateQueries({ queryKey: ['purchase-orders'] })
      router.replace(`/(app)/purchase-orders/${order.id}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to create purchase order.',
      )
    },
  })

  return (
    <Screen title="New purchase order" subtitle="Order stock from supplier" keyboardAvoiding>
      <View className="gap-section-header">
        <SectionHeader title="Header" compact icon="create-outline" />
        <FormField
          placeholder="Order number (optional)"
          value={form.orderNumber}
          onChangeText={(orderNumber) =>
            setForm((current) => ({ ...current, orderNumber }))
          }
        />
        <FormField
          placeholder="YYYY-MM-DD"
          value={form.orderDate}
          onChangeText={(orderDate) =>
            setForm((current) => ({ ...current, orderDate }))
          }
        />
        <PickerField
          label="Supplier"
          value={selectedSupplier?.name}
          placeholder="Select supplier"
          onPress={() => setSupplierPickerOpen(true)}
        />
        <FormField
          placeholder="Optional note"
          value={form.narration}
          onChangeText={(narration) =>
            setForm((current) => ({ ...current, narration }))
          }
        />
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Line item" compact icon="cube-outline" />
        <PickerField
          label="Item"
          value={selectedItem?.name}
          placeholder="Select item"
          onPress={() => setItemPickerOpen(true)}
        />
        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="mb-1 text-sm text-muted-foreground">Quantity</Text>
            <FormField
              keyboardType="decimal-pad"
              placeholder="1"
              value={form.line.quantity}
              onChangeText={(quantity) =>
                setForm((current) => ({
                  ...current,
                  line: { ...current.line, quantity },
                }))
              }
            />
          </View>
          <View className="flex-1">
            <Text className="mb-1 text-sm text-muted-foreground">Rate</Text>
            <FormField
              keyboardType="decimal-pad"
              placeholder="0.00"
              value={form.line.rate}
              onChangeText={(rate) =>
                setForm((current) => ({
                  ...current,
                  line: { ...current.line, rate },
                }))
              }
            />
          </View>
        </View>
      </View>

      {error ? <Text className="text-sm text-destructive">{error}</Text> : null}

      <View className="flex-row gap-3">
        <View className="flex-1">
          <SecondaryButton label="Cancel" onPress={() => router.back()} />
        </View>
        <View className="flex-1">
          <PrimaryButton
            label={saveMutation.isPending ? 'Saving…' : 'Create order'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

      <PickerModal
        visible={supplierPickerOpen}
        title="Supplier"
        options={suppliers.map((party) => ({
          key: party.id,
          label: party.name,
        }))}
        onSelect={(supplierId) =>
          setForm((current) => ({ ...current, supplierId }))
        }
        onClose={() => setSupplierPickerOpen(false)}
      />
      <PickerModal
        visible={itemPickerOpen}
        title="Item"
        options={items.map((item) => ({ key: item.id, label: item.name }))}
        onSelect={(itemId) => {
          const item = items.find((entry) => entry.id === itemId)
          if (!item) return
          setForm((current) => ({
            ...current,
            line: applyItemToPurchaseOrderLine(current.line, item),
          }))
        }}
        onClose={() => setItemPickerOpen(false)}
      />
    </Screen>
  )
}
