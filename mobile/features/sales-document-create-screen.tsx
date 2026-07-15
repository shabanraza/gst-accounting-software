import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { DetailCard } from '@/components/data/detail-card'
import { Screen } from '@/components/layout/screen'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
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
      footer={
        <WizardFooter>
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <PrimaryButton
            label={saveMutation.isPending ? 'Saving…' : 'Create document'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </WizardFooter>
      }
    >
      <DetailCard title="Document type" icon="document-text-outline">
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
      </DetailCard>

      <DetailCard title="Header" icon="create-outline">
        <View className="gap-3">
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
          <PickerField
            label="Customer"
            value={selectedCustomer?.name}
            placeholder="Select customer"
            onPress={() => setCustomerPickerOpen(true)}
          />
        </View>
      </DetailCard>

      <DetailCard title="Line item" icon="cube-outline">
        <View className="gap-3">
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
      </DetailCard>

      <PickerModal
        visible={customerPickerOpen}
        title="Customer"
        options={customers.map((party) => ({
          key: party.id,
          label: party.name,
        }))}
        onSelect={(customerId) =>
          setForm((current) => ({ ...current, customerId }))
        }
        onClose={() => setCustomerPickerOpen(false)}
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
            line: applyItemToSalesDocumentLine(current.line, item),
          }))
        }}
        onClose={() => setItemPickerOpen(false)}
      />
    </Screen>
  )
}
