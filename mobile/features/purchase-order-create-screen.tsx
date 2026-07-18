import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { CreateScreenFooter } from '@/components/layout/create-screen-footer'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { DateField } from '@/components/ui/date-field'
import { FormField } from '@/components/ui/form-field'
import { FormFieldGroup } from '@/components/ui/form-label'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { AddLineButton } from '@/components/voucher/add-line-button'
import { DocumentLineEditor } from '@/components/voucher/document-line-editor'
import { DocumentTotalsBar } from '@/components/voucher/voucher-totals-bar'
import {
  RecentPartyChips,
  useRecentParties,
} from '@/components/voucher/recent-party-chips'
import {
  usePurchaseItems,
  usePurchaseParties,
} from '@/features/use-purchase-masters'
import {
  applyItemToPurchaseOrderLine,
  buildCreatePurchaseOrderInput,
  computePurchaseOrderFormTotal,
  createEmptyPurchaseOrderLine,
  createInitialPurchaseOrderForm,
  filterSupplierParties,
  validatePurchaseOrderForm,
  type PurchaseOrderFormDraft,
  type PurchaseOrderLineDraft,
} from '@/lib/purchase-order-form'
import {
  useFormPickerCoordination,
} from '@/lib/form-picker-coordination'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function PurchaseOrderCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId } = useWorkspace()
  const { recentIds, rememberParty } = useRecentParties(companyId, 'supplier')
  const partiesQuery = usePurchaseParties()
  const itemsQuery = usePurchaseItems()
  const [form, setForm] = React.useState<PurchaseOrderFormDraft>(
    createInitialPurchaseOrderForm,
  )
  const pickers = useFormPickerCoordination(['supplier'] as const)
  const [error, setError] = React.useState<string | null>(null)

  const suppliers = filterSupplierParties(partiesQuery.data ?? [])
  const items = itemsQuery.data ?? []
  const selectedSupplier = suppliers.find((party) => party.id === form.supplierId)
  const estimatedTotal = computePurchaseOrderFormTotal(form)

  const updateLine = React.useCallback(
    (index: number, nextLine: PurchaseOrderLineDraft) => {
      setForm((current) => ({
        ...current,
        lines: current.lines.map((line, lineIndex) =>
          lineIndex === index ? nextLine : line,
        ),
      }))
    },
    [],
  )

  const addLine = React.useCallback(() => {
    setForm((current) => ({
      ...current,
      lines: [...current.lines, createEmptyPurchaseOrderLine()],
    }))
  }, [])

  const removeLine = React.useCallback((index: number) => {
    setForm((current) => ({
      ...current,
      lines:
        current.lines.length > 1
          ? current.lines.filter((_, lineIndex) => lineIndex !== index)
          : current.lines,
    }))
  }, [])

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
      <Screen
        title="New purchase order"
        subtitle="Order stock from supplier"
        keyboardAvoiding
        footer={
            <CreateScreenFooter
              error={error}
              loading={saveMutation.isPending}
              onCancel={() => router.back()}
              onSubmit={() => saveMutation.mutate()}
              submitLabel="Create order"
            />
        }
      >
      <FormSection title="Header" icon="create-outline">
        <DateField
          label="Order date"
          value={form.orderDate}
          onChange={(orderDate) =>
            setForm((current) => ({ ...current, orderDate }))
          }
        />
        <PickerField
          label="Supplier"
          value={selectedSupplier?.name}
          placeholder="Select supplier"
          onPress={() => pickers.open('supplier')}
        />
        <RecentPartyChips
          createHref="/(app)/parties/new"
          createLabel="Add new supplier"
          parties={suppliers}
          recentIds={recentIds}
          selectedId={form.supplierId}
          onSelect={(supplierId) => {
            void rememberParty(supplierId)
            setForm((current) => ({ ...current, supplierId }))
          }}
        />
        <CollapsibleSection
          defaultOpen={false}
          filledCount={
            (form.orderNumber.trim() ? 1 : 0) + (form.narration.trim() ? 1 : 0)
          }
          title="References"
        >
          <FormFieldGroup label="Order number">
            <FormField
              placeholder="Auto if blank"
              value={form.orderNumber}
              onChangeText={(orderNumber) =>
                setForm((current) => ({ ...current, orderNumber }))
              }
            />
          </FormFieldGroup>
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

      <FormSection title="Items" icon="cube-outline">
        <View className="gap-section-header">
          {form.lines.map((line, index) => (
            <DocumentLineEditor
              key={line.key}
              line={line}
              index={index}
              items={items.map((item) => ({
                id: item.id,
                name: item.name,
                baseUnit: item.baseUnit,
                rate: item.purchaseRate,
                gstRate: item.gstRate,
              }))}
              showGst
              canRemove={form.lines.length > 1}
              onChange={(nextLine) => updateLine(index, nextLine)}
              onRemove={() => removeLine(index)}
              applyItem={(currentLine, item) =>
                applyItemToPurchaseOrderLine(currentLine, {
                  id: item.id,
                  name: item.name,
                  baseUnit: item.baseUnit,
                  purchaseRate: item.rate,
                  gstRate: item.gstRate ?? '0',
                })
              }
            />
          ))}
          <AddLineButton onPress={addLine} />
          <DocumentTotalsBar total={estimatedTotal} />
        </View>
      </FormSection>

      <PickerModal
        visible={pickers.isOpen('supplier')}
        title="Supplier"
        options={suppliers.map((party) => ({
          key: party.id,
          label: party.name,
        }))}
        onSelect={(supplierId) =>
          setForm((current) => ({ ...current, supplierId }))
        }
        onClose={pickers.closeAll}
      />
    </Screen>
  )
}
