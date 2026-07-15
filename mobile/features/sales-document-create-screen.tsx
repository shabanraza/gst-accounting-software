import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { Modal, Pressable } from 'react-native'

import { SectionHeader } from '@/components/section-header'
import {
  CardRow,
  FormField,
  PrimaryButton,
  Screen,
  SecondaryButton,
} from '@/components/screen'
import { useSalesItems, useSalesParties } from '@/features/use-sales-masters'
import {
  SALES_DOCUMENT_SERIES,
  applyItemToSalesDocumentLine,
  buildCreateSalesDocumentInput,
  createInitialSalesDocumentForm,
  filterCustomerParties,
  validateSalesDocumentForm,
  type SalesDocumentFormDraft,
  type SalesDocumentType,
} from '@/lib/sales-document-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

const documentTypeLabels: Record<SalesDocumentType, string> = {
  quotation: 'Quotation',
  sales_order: 'Sales order',
  delivery_challan: 'Delivery challan',
}

function OptionChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      className={`rounded-full border px-4 py-2 ${active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${active ? 'text-primary' : 'text-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function PickerModal<T extends { id: string }>({
  visible,
  title,
  items,
  renderLabel,
  onSelect,
  onClose,
}: {
  visible: boolean
  title: string
  items: Array<T>
  renderLabel: (item: T) => string
  onSelect: (item: T) => void
  onClose: () => void
}) {
  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[70%] rounded-t-3xl bg-background p-page-x pb-page-bottom">
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-foreground">{title}</Text>
            <Pressable onPress={onClose}>
              <Text className="text-sm font-medium text-primary">Close</Text>
            </Pressable>
          </View>
          <View className="gap-3">
            {items.map((item) => (
              <CardRow
                key={item.id}
                title={renderLabel(item)}
                onPress={() => {
                  onSelect(item)
                  onClose()
                }}
              />
            ))}
          </View>
        </View>
      </View>
    </Modal>
  )
}

export function SalesDocumentCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, activeFinancialYearId, company } = useWorkspace()
  const partiesQuery = useSalesParties()
  const itemsQuery = useSalesItems()
  const [form, setForm] = React.useState<SalesDocumentFormDraft>(
    createInitialSalesDocumentForm,
  )
  const [customerPickerOpen, setCustomerPickerOpen] = React.useState(false)
  const [itemPickerOpen, setItemPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const customers = filterCustomerParties(partiesQuery.data ?? [])
  const items = itemsQuery.data ?? []
  const selectedCustomer = customers.find((party) => party.id === form.customerId)
  const selectedItem = items.find((item) => item.id === form.line.itemId)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !company) {
        throw new Error('Workspace not ready')
      }

      const validationError = validateSalesDocumentForm(form)
      if (validationError) {
        throw new Error(validationError)
      }

      if (!activeFinancialYearId) {
        throw new Error('Financial year is not configured.')
      }

      const documentNumber =
        form.documentNumber.trim() ||
        (await trpcClient.documents.nextNumber.mutate({
          companyId: company.id,
          financialYearId: activeFinancialYearId,
          voucherType: 'sales',
          series: SALES_DOCUMENT_SERIES[form.documentType],
          padLength: 4,
        }))

      return trpcClient.salesDocuments.create.mutate(
        buildCreateSalesDocumentInput(form, companyId, documentNumber),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['module-list', 'sales-documents'],
      })
      router.back()
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to create document.',
      )
    },
  })

  return (
    <Screen
      title="New sales document"
      subtitle="Quotation, sales order, or delivery challan"
      keyboardAvoiding
    >
      <View className="gap-section-header">
        <SectionHeader title="Document type" compact icon="document-text-outline" />
        <View className="flex-row flex-wrap gap-2">
          {(Object.keys(documentTypeLabels) as Array<SalesDocumentType>).map(
            (documentType) => (
              <OptionChip
                key={documentType}
                label={documentTypeLabels[documentType]}
                active={form.documentType === documentType}
                onPress={() => setForm((current) => ({ ...current, documentType }))}
              />
            ),
          )}
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Header" compact icon="create-outline" />
        <FormField
          placeholder="Document number (optional)"
          value={form.documentNumber}
          onChangeText={(documentNumber) =>
            setForm((current) => ({ ...current, documentNumber }))
          }
        />
        <FormField
          placeholder="YYYY-MM-DD"
          value={form.documentDate}
          onChangeText={(documentDate) =>
            setForm((current) => ({ ...current, documentDate }))
          }
        />
        <Pressable
          className="rounded-xl border border-border bg-card px-4 py-3"
          onPress={() => setCustomerPickerOpen(true)}
        >
          <Text className="text-sm text-muted-foreground">Customer</Text>
          <Text className="font-medium text-foreground">
            {selectedCustomer?.name ?? 'Select customer'}
          </Text>
        </Pressable>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Line item" compact icon="cube-outline" />
        <Pressable
          className="rounded-xl border border-border bg-card px-4 py-3"
          onPress={() => setItemPickerOpen(true)}
        >
          <Text className="text-sm text-muted-foreground">Item</Text>
          <Text className="font-medium text-foreground">
            {selectedItem?.name ?? 'Select item'}
          </Text>
        </Pressable>
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
            label={saveMutation.isPending ? 'Saving…' : 'Create document'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

      <PickerModal
        visible={customerPickerOpen}
        title="Customer"
        items={customers}
        renderLabel={(party) => party.name}
        onSelect={(party) =>
          setForm((current) => ({ ...current, customerId: party.id }))
        }
        onClose={() => setCustomerPickerOpen(false)}
      />
      <PickerModal
        visible={itemPickerOpen}
        title="Item"
        items={items}
        renderLabel={(item) => item.name}
        onSelect={(item) =>
          setForm((current) => ({
            ...current,
            line: applyItemToSalesDocumentLine(current.line, item),
          }))
        }
        onClose={() => setItemPickerOpen(false)}
      />
    </Screen>
  )
}
