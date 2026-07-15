import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'

import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { OptionChip } from '@/components/ui/chip'
import { FormField } from '@/components/ui/form-field'
import { PickerField } from '@/components/ui/picker-field'
import { PickerModal } from '@/components/ui/picker-modal'
import { useSalesParties } from '@/features/use-sales-masters'
import {
  buildPurchaseReturnInput,
  buildSalesReturnInput,
  createInitialReturnForm,
  resolvePartyStateCode,
  validateReturnForm,
  validateReturnLedgerMappings,
  type ReturnFormDraft,
  type ReturnMode,
} from '@/lib/return-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function ReturnCreateScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { companyId, companyStateCode, ledgerBySystemKey } = useWorkspace()
  const partiesQuery = useSalesParties()
  const [form, setForm] = React.useState<ReturnFormDraft>(createInitialReturnForm)
  const [documentPickerOpen, setDocumentPickerOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const salesQuery = useQuery({
    queryKey: ['return-sales', companyId],
    enabled: Boolean(companyId) && form.mode === 'sales',
    queryFn: () =>
      trpcClient.sales.list.query({
        companyId: companyId!,
      }),
  })

  const purchasesQuery = useQuery({
    queryKey: ['return-purchases', companyId],
    enabled: Boolean(companyId) && form.mode === 'purchase',
    queryFn: () =>
      trpcClient.purchases.list.query({
        companyId: companyId!,
      }),
  })

  const documents =
    form.mode === 'sales'
      ? (salesQuery.data ?? [])
      : (purchasesQuery.data ?? [])

  const selectedDocument = documents.find((entry) => entry.id === form.documentId)
  const documentLabel =
    form.mode === 'sales'
      ? ((selectedDocument as { invoiceNumber?: string } | undefined)
          ?.invoiceNumber ?? undefined)
      : ((selectedDocument as { supplierBillNumber?: string } | undefined)
          ?.supplierBillNumber ?? undefined)

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !companyStateCode) {
        throw new Error('Workspace not ready')
      }

      const validationError = validateReturnForm(form)
      if (validationError) throw new Error(validationError)

      const ledgerError = validateReturnLedgerMappings({
        mode: form.mode,
        ledgerBySystemKey,
      })
      if (ledgerError) throw new Error(ledgerError)

      if (form.mode === 'sales') {
        const invoice = salesQuery.data?.find((entry) => entry.id === form.documentId)
        if (!invoice?.lines[0]) {
          throw new Error('Selected invoice has no line items.')
        }

        const party = (partiesQuery.data ?? []).find(
          (entry) => entry.id === invoice.customerId,
        )
        const customerStateCode = resolvePartyStateCode(
          party,
          companyStateCode,
        )

        return trpcClient.returns.postSalesReturn.mutate(
          buildSalesReturnInput({
            form,
            companyId,
            companyStateCode,
            customerId: invoice.customerId,
            customerStateCode,
            salesInvoiceId: invoice.id,
            quantity: form.quantity,
            line: invoice.lines[0],
            ledgerBySystemKey,
          }),
        )
      }

      const bill = purchasesQuery.data?.find(
        (entry) => entry.id === form.documentId,
      )
      if (!bill?.lines[0]) {
        throw new Error('Selected bill has no line items.')
      }

      const party = (partiesQuery.data ?? []).find(
        (entry) => entry.id === bill.supplierId,
      )
      const supplierStateCode = resolvePartyStateCode(party, companyStateCode)

      return trpcClient.returns.postPurchaseReturn.mutate(
        buildPurchaseReturnInput({
          form,
          companyId,
          companyStateCode,
          supplierId: bill.supplierId,
          supplierStateCode,
          purchaseBillId: bill.id,
          quantity: form.quantity,
          line: bill.lines[0],
          ledgerBySystemKey,
        }),
      )
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'returns'] })
      router.back()
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Unable to post return.',
      )
    },
  })

  function setMode(mode: ReturnMode) {
    setForm((current) => ({
      ...current,
      mode,
      documentId: '',
    }))
  }

  return (
    <Screen title="Credit / debit note" subtitle="Post a sales or purchase return" keyboardAvoiding>
      <View className="gap-section-header">
        <SectionHeader title="Return type" compact icon="return-down-back-outline" />
        <View className="flex-row flex-wrap gap-2">
          <OptionChip
            label="Sales return"
            active={form.mode === 'sales'}
            onPress={() => setMode('sales')}
          />
          <OptionChip
            label="Purchase return"
            active={form.mode === 'purchase'}
            onPress={() => setMode('purchase')}
          />
        </View>
      </View>

      <View className="gap-section-header">
        <SectionHeader title="Document" compact icon="document-text-outline" />
        <PickerField
          label={form.mode === 'sales' ? 'Sales invoice' : 'Purchase bill'}
          value={documentLabel}
          placeholder="Select document"
          onPress={() => setDocumentPickerOpen(true)}
        />
        <FormField
          placeholder="YYYY-MM-DD"
          value={form.returnDate}
          onChangeText={(returnDate) =>
            setForm((current) => ({ ...current, returnDate }))
          }
        />
        <FormField
          keyboardType="decimal-pad"
          placeholder="Return quantity"
          value={form.quantity}
          onChangeText={(quantity) =>
            setForm((current) => ({ ...current, quantity }))
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
            label={saveMutation.isPending ? 'Posting…' : 'Post return'}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onPress={() => saveMutation.mutate()}
          />
        </View>
      </View>

      <PickerModal
        visible={documentPickerOpen}
        title={form.mode === 'sales' ? 'Sales invoice' : 'Purchase bill'}
        options={documents.map((document) => ({
          key: document.id,
          label:
            form.mode === 'sales'
              ? ((document as { invoiceNumber: string }).invoiceNumber ??
                document.id)
              : ((document as { supplierBillNumber: string })
                  .supplierBillNumber ?? document.id),
        }))}
        onSelect={(documentId) =>
          setForm((current) => ({ ...current, documentId }))
        }
        onClose={() => setDocumentPickerOpen(false)}
      />
    </Screen>
  )
}
