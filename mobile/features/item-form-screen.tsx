import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import {
  CreateScreenFooter,
  SaveScreenFooter,
} from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import {
  gstRateOptions,
  itemGroups,
  unitOptions,
} from '@/lib/india-masters'
import {
  buildCreateItemInput,
  buildUpdateItemInput,
  createInitialItemForm,
  validateItemForm,
  type ItemFormDraft,
} from '@/lib/item-form'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

type ItemFormScreenProps = {
  mode: 'create' | 'edit'
  itemId?: string
  initialForm?: ItemFormDraft
}

export function ItemFormScreen({
  mode,
  itemId,
  initialForm,
}: ItemFormScreenProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const [form, setForm] = React.useState<ItemFormDraft>(
    () => initialForm ?? createInitialItemForm(),
  )
  const [groupPickerOpen, setGroupPickerOpen] = React.useState(false)
  const [unitPickerOpen, setUnitPickerOpen] = React.useState(false)
  const [gstPickerOpen, setGstPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (initialForm) {
      setForm(initialForm)
    }
  }, [initialForm])

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) {
        throw new Error('Workspace not ready')
      }

      const validationError = validateItemForm(form)
      if (validationError) {
        throw new Error(validationError)
      }

      if (mode === 'edit') {
        if (!itemId) {
          throw new Error('Item not found')
        }

        return trpcClient.inventory.updateItem.mutate(
          buildUpdateItemInput(form, companyId, itemId),
        )
      }

      return trpcClient.inventory.createItemWithOpening.mutate(
        buildCreateItemInput(form, companyId),
      )
    },
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'items'] })
      await queryClient.invalidateQueries({ queryKey: ['sales-items', companyId] })
      if (mode === 'edit' && itemId) {
        await queryClient.invalidateQueries({
          queryKey: ['item-detail', companyId, itemId],
        })
        router.back()
        return
      }
      const createdItemId = 'item' in item ? item.item.id : item.id
      router.replace(`/(app)/items/${createdItemId}` as never)
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : mode === 'edit'
            ? 'Unable to update item.'
            : 'Unable to create item.',
      )
    },
  })

  return (
    <Screen
      title={mode === 'edit' ? 'Edit item' : 'New item'}
      subtitle={
        mode === 'edit'
          ? 'Update item master fields'
          : 'Item master with optional opening stock'
      }
      keyboardAvoiding
      footer={
        mode === 'edit' ? (
          <SaveScreenFooter
            error={error}
            loading={saveMutation.isPending}
            onSubmit={() => saveMutation.mutate()}
            submitLabel="Save changes"
          />
        ) : (
          <CreateScreenFooter
            error={error}
            loading={saveMutation.isPending}
            onCancel={() => router.back()}
            onSubmit={() => saveMutation.mutate()}
            submitLabel="Create item"
          />
        )
      }
    >
      <FormSection title="Basic details" icon="cube-outline">
        <View className="gap-3">
          <FormFieldGroup label="Item name">
            <FormField
              placeholder="Item name"
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
            />
          </FormFieldGroup>
          <FormFieldGroup label="Alias">
            <FormField
              placeholder="Optional"
              value={form.alias}
              onChangeText={(alias) => setForm((current) => ({ ...current, alias }))}
            />
          </FormFieldGroup>
          <PickerField
            label="Group"
            value={form.itemGroup}
            onPress={() => setGroupPickerOpen(true)}
          />
          <FormFieldGroup label="HSN code">
            <FormField
              placeholder="HSN code"
              value={form.hsnCode}
              onChangeText={(hsnCode) =>
                setForm((current) => ({ ...current, hsnCode }))
              }
            />
          </FormFieldGroup>
          <PickerField
            label="GST rate"
            value={`${form.gstRate}%`}
            onPress={() => setGstPickerOpen(true)}
          />
          <PickerField
            label="Base unit"
            value={form.baseUnit}
            onPress={() => setUnitPickerOpen(true)}
          />
        </View>
      </FormSection>

      <FormSection title="Pricing" icon="pricetag-outline">
        <View className="flex-row gap-3">
          <View className="flex-1">
            <FormFieldGroup label="Purchase rate">
              <FormField
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={form.purchaseRate}
                onChangeText={(purchaseRate) =>
                  setForm((current) => ({ ...current, purchaseRate }))
                }
              />
            </FormFieldGroup>
          </View>
          <View className="flex-1">
            <FormFieldGroup label="Sale rate">
              <FormField
                keyboardType="decimal-pad"
                placeholder="0.00"
                value={form.saleRate}
                onChangeText={(saleRate) =>
                  setForm((current) => ({ ...current, saleRate }))
                }
              />
            </FormFieldGroup>
          </View>
        </View>
      </FormSection>

      <FormSection title="Inventory" icon="layers-outline">
        <View className="gap-3">
          <FormFieldGroup label="Tracking">
            <View className="flex-row flex-wrap gap-2">
              <OptionChip
                label="Track inventory"
                active={form.tracksInventory}
                onPress={() =>
                  setForm((current) => ({ ...current, tracksInventory: true }))
                }
              />
              <OptionChip
                label="Non-inventory"
                active={!form.tracksInventory}
                onPress={() =>
                  setForm((current) => ({ ...current, tracksInventory: false }))
                }
              />
            </View>
          </FormFieldGroup>
          {mode === 'create' && form.tracksInventory ? (
            <FormFieldGroup label="Opening quantity">
              <FormField
                keyboardType="decimal-pad"
                placeholder="Optional"
                value={form.openingQuantity}
                onChangeText={(openingQuantity) =>
                  setForm((current) => ({ ...current, openingQuantity }))
                }
              />
            </FormFieldGroup>
          ) : null}
        </View>
      </FormSection>

      <PickerModal
        visible={groupPickerOpen}
        title="Item group"
        options={itemGroups.map((group) => ({ key: group, label: group }))}
        onSelect={(itemGroup) =>
          setForm((current) => ({ ...current, itemGroup }))
        }
        onClose={() => setGroupPickerOpen(false)}
      />
      <PickerModal
        visible={unitPickerOpen}
        title="Base unit"
        options={unitOptions.map((unit) => ({ key: unit, label: unit }))}
        onSelect={(baseUnit) => setForm((current) => ({ ...current, baseUnit }))}
        onClose={() => setUnitPickerOpen(false)}
      />
      <PickerModal
        visible={gstPickerOpen}
        title="GST rate"
        options={gstRateOptions.map((rate) => ({
          key: String(rate),
          label: `${rate}%`,
        }))}
        onSelect={(gstRate) =>
          setForm((current) => ({ ...current, gstRate }))
        }
        onClose={() => setGstPickerOpen(false)}
      />
    </Screen>
  )
}

export function ItemCreateScreen() {
  return <ItemFormScreen mode="create" />
}
