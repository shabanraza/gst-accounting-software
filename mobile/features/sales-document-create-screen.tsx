import * as React from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { CollapsibleSection } from '@/components/layout/collapsible-section'
import { FormSection } from '@/components/layout/form-section'
import { Screen } from '@/components/layout/screen'
import { WizardFooter } from '@/components/layout/wizard-footer'
import { PrimaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
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
import { useSalesItems, useSalesParties } from '@/features/use-sales-masters'
import {
  SALES_DOCUMENT_SERIES,
  applyItemToSalesDocumentLine,
  buildCreateSalesDocumentInput,
  computeSalesDocumentFormTotal,
  createEmptySalesDocumentLine,
  createInitialSalesDocumentForm,
  filterCustomerParties,
  validateSalesDocumentForm,
  type SalesDocumentFormDraft,
  type SalesDocumentLineDraft,
  type SalesDocumentType,
} from '@/lib/sales-document-form'
import {
  useFormPickerCoordination,
} from '@/lib/form-picker-coordination'
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
  const { recentIds, rememberParty } = useRecentParties(companyId, 'customer')
  const partiesQuery = useSalesParties()
  const itemsQuery = useSalesItems()
  const [form, setForm] = React.useState<SalesDocumentFormDraft>(
    createInitialSalesDocumentForm,
  )
  const pickers = useFormPickerCoordination(['customer'] as const)
  const [error, setError] = React.useState<string | null>(null)

  const customers = filterCustomerParties(partiesQuery.data ?? [])
  const items = itemsQuery.data ?? []
  const selectedCustomer = customers.find((party) => party.id === form.customerId)
  const estimatedTotal = computeSalesDocumentFormTotal(form)

  const updateLine = React.useCallback(
    (index: number, nextLine: SalesDocumentLineDraft) => {
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
      lines: [...current.lines, createEmptySalesDocumentLine()],
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
                label="Create document"
                loading={saveMutation.isPending}
                disabled={saveMutation.isPending}
                onPress={() => saveMutation.mutate()}
              />
            </WizardFooter>
        }
      >
      <FormSection title="Document type" icon="document-text-outline">
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
      </FormSection>

      <FormSection title="Header" icon="create-outline">
        <View className="gap-3">
          <DateField
            label="Document date"
            value={form.documentDate}
            onChange={(documentDate) =>
              setForm((current) => ({ ...current, documentDate }))
            }
          />
          <PickerField
            label="Customer"
            value={selectedCustomer?.name}
            placeholder="Select customer"
            onPress={() => pickers.open('customer')}
          />
          <RecentPartyChips
            createHref="/(app)/parties/new"
            createLabel="Add new customer"
            parties={customers}
            recentIds={recentIds}
            selectedId={form.customerId}
            onSelect={(customerId) => {
              void rememberParty(customerId)
              setForm((current) => ({ ...current, customerId }))
            }}
          />
          <CollapsibleSection defaultOpen={false} title="References">
            <FormFieldGroup label="Document number">
              <FormField
                placeholder="Auto if blank"
                value={form.documentNumber}
                onChangeText={(documentNumber) =>
                  setForm((current) => ({ ...current, documentNumber }))
                }
              />
            </FormFieldGroup>
          </CollapsibleSection>
        </View>
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
                rate: item.saleRate,
              }))}
              canRemove={form.lines.length > 1}
              onChange={(nextLine) => updateLine(index, nextLine)}
              onRemove={() => removeLine(index)}
              applyItem={(currentLine, item) =>
                applyItemToSalesDocumentLine(currentLine, {
                  id: item.id,
                  name: item.name,
                  baseUnit: item.baseUnit,
                  saleRate: item.rate,
                })
              }
            />
          ))}
          <AddLineButton onPress={addLine} />
          <DocumentTotalsBar total={estimatedTotal} />
        </View>
      </FormSection>

      <PickerModal
        visible={pickers.isOpen('customer')}
        title="Customer"
        options={customers.map((party) => ({
          key: party.id,
          label: party.name,
        }))}
        onSelect={(customerId) =>
          setForm((current) => ({ ...current, customerId }))
        }
        onClose={pickers.closeAll}
      />
    </Screen>
  )
}
