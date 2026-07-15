import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pressable } from 'react-native'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import type { ScreenVariant } from '@/lib/navigation'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { BottomSheet } from '@/components/ui/dialog'
import { FormField } from '@/components/ui/form-field'
import { formatInr } from '@/lib/format-inr'
import { pageLayout } from '@/lib/spacing'
import {
  buildCustomerReceiptInput,
  buildSupplierPaymentInput,
  filterOpenPurchaseDocuments,
  filterOpenSalesDocuments,
  validatePaymentAllocation,
  validateReceiptLedgers,
  validateSupplierPaymentLedgers,
  type PaymentAllocationDraft,
  type PaymentTab,
} from '@/lib/payment-form'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function TabChip({
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
      className={`rounded-full px-4 py-2 ${active ? 'bg-primary' : 'bg-muted'}`}
      onPress={onPress}
    >
      <Text
        className={`text-sm font-medium ${active ? 'text-primary-foreground' : 'text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  )
}

function AllocationModal({
  visible,
  mode,
  documents,
  partyName,
  draft,
  onChange,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  visible: boolean
  mode: PaymentTab
  documents: Array<{
    id: string
    label: string
    outstandingAmount: string
  }>
  partyName: (documentId: string) => string
  draft: PaymentAllocationDraft
  onChange: (draft: PaymentAllocationDraft) => void
  onClose: () => void
  onSubmit: () => void
  submitting: boolean
  error: string | null
}) {
  const selected = documents.find((document) => document.id === draft.documentId)

  return (
    <BottomSheet
      open={visible}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      title={mode === 'receipts' ? 'Customer receipt' : 'Supplier payment'}
      maxHeightRatio={0.85}
    >
      {documents.length === 0 ? (
        <EmptyState
          message={
            mode === 'receipts'
              ? 'No open credit invoices. Create a credit sale first.'
              : 'No open purchase bills with balance due.'
          }
        />
      ) : (
        <View style={{ gap: pageLayout.sectionGap }}>
          <View style={{ gap: pageLayout.sectionHeaderGap }}>
            <SectionHeader title="Document" compact icon="document-text-outline" />
            <View style={{ gap: pageLayout.sectionHeaderGap }}>
              {documents.map((document) => (
                <CardRow
                  key={document.id}
                  title={document.label}
                  subtitle={`${partyName(document.id)} · due ${formatInr(document.outstandingAmount)}`}
                  badge={draft.documentId === document.id ? 'Selected' : undefined}
                  onPress={() =>
                    onChange({
                      ...draft,
                      documentId: document.id,
                      amount: document.outstandingAmount,
                    })
                  }
                />
              ))}
            </View>
          </View>

          <View style={{ gap: pageLayout.sectionHeaderGap }}>
            <SectionHeader title="Amount" compact icon="cash-outline" />
            <FormField
              keyboardType="decimal-pad"
              placeholder="Amount"
              value={draft.amount}
              onChangeText={(amount) => onChange({ ...draft, amount })}
            />
            <Text className="text-sm text-muted-foreground">
              Outstanding: {formatInr(selected?.outstandingAmount ?? '0')}
            </Text>
          </View>

          <View style={{ gap: pageLayout.sectionHeaderGap }}>
            <SectionHeader title="Date" compact icon="calendar-outline" />
            <FormField
              placeholder="YYYY-MM-DD"
              value={draft.paymentDate}
              onChangeText={(paymentDate) =>
                onChange({ ...draft, paymentDate })
              }
            />
          </View>

          {error ? (
            <Text className="text-sm text-destructive">{error}</Text>
          ) : null}

          <PrimaryButton
            label={submitting ? 'Posting…' : 'Post allocation'}
            loading={submitting}
            disabled={submitting}
            onPress={onSubmit}
          />
        </View>
      )}
    </BottomSheet>
  )
}

function createInitialDraft(): PaymentAllocationDraft {
  return {
    documentId: '',
    amount: '',
    paymentDate: new Date().toISOString().slice(0, 10),
  }
}

export function PaymentsScreen({ variant = 'stack' }: { variant?: ScreenVariant }) {
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey, isReady } = useWorkspace()
  const [mode, setMode] = React.useState<PaymentTab>('receipts')
  const [modalOpen, setModalOpen] = React.useState(false)
  const [draft, setDraft] = React.useState<PaymentAllocationDraft>(createInitialDraft)
  const [error, setError] = React.useState<string | null>(null)

  const salesQuery = useQuery({
    queryKey: ['payments-sales', companyId],
    enabled: Boolean(companyId) && isReady,
    queryFn: () =>
      trpcClient.sales.list.query({
        companyId: companyId!,
      }),
  })

  const purchasesQuery = useQuery({
    queryKey: ['payments-purchases', companyId],
    enabled: Boolean(companyId) && isReady,
    queryFn: () =>
      trpcClient.purchases.list.query({
        companyId: companyId!,
      }),
  })

  const partiesQuery = useQuery({
    queryKey: ['payments-parties', companyId],
    enabled: Boolean(companyId) && isReady,
    queryFn: () =>
      trpcClient.parties.list.query({
        companyId: companyId!,
      }),
  })

  const partyNameById = React.useMemo(() => {
    const map = new Map(
      (partiesQuery.data ?? []).map((party) => [party.id, party.name]),
    )
    return (id: string) => map.get(id) ?? id.slice(0, 8)
  }, [partiesQuery.data])

  const openSales = filterOpenSalesDocuments(salesQuery.data ?? [])
  const openPurchases = filterOpenPurchaseDocuments(purchasesQuery.data ?? [])

  const allocationMutation = useMutation({
    mutationFn: async () => {
      if (!companyId) {
        throw new Error('Workspace not ready')
      }

      const documents =
        mode === 'receipts'
          ? openSales.map((document) => ({
              id: document.id,
              outstandingAmount: document.outstandingAmount,
            }))
          : openPurchases.map((document) => ({
              id: document.id,
              outstandingAmount: document.outstandingAmount,
            }))

      const selected = documents.find((document) => document.id === draft.documentId)
      const validationError = validatePaymentAllocation(
        draft,
        selected?.outstandingAmount ?? '0',
      )
      if (validationError) {
        throw new Error(validationError)
      }

      if (mode === 'receipts') {
        const ledgerError = validateReceiptLedgers(ledgerBySystemKey)
        if (ledgerError) {
          throw new Error(ledgerError)
        }

        return trpcClient.payments.allocateCustomerReceipt.mutate(
          buildCustomerReceiptInput({
            companyId,
            draft,
            ledgerBySystemKey,
          }),
        )
      }

      const ledgerError = validateSupplierPaymentLedgers(ledgerBySystemKey)
      if (ledgerError) {
        throw new Error(ledgerError)
      }

      return trpcClient.payments.allocateSupplierPayment.mutate(
        buildSupplierPaymentInput({
          companyId,
          draft,
          ledgerBySystemKey,
        }),
      )
    },
    onSuccess: async () => {
      setError(null)
      setModalOpen(false)
      setDraft(createInitialDraft())
      await queryClient.invalidateQueries({ queryKey: ['payments-sales', companyId] })
      await queryClient.invalidateQueries({
        queryKey: ['payments-purchases', companyId],
      })
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'sales'] })
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'purchases'] })
    },
    onError: (mutationError) => {
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : 'Allocation failed.',
      )
    },
  })

  const list =
    mode === 'receipts'
      ? openSales.map((document) => ({
          id: document.id,
          label: document.invoiceNumber,
          partyId: document.customerId,
          totalAmount: document.totalAmount,
          outstandingAmount: document.outstandingAmount,
          paymentStatus: document.paymentStatus,
        }))
      : openPurchases.map((document) => ({
          id: document.id,
          label: document.supplierBillNumber,
          partyId: document.supplierId,
          totalAmount: document.totalAmount,
          outstandingAmount: document.outstandingAmount,
          paymentStatus: document.paymentStatus,
        }))

  const modalDocuments = list.map((document) => ({
    id: document.id,
    label: document.label,
    outstandingAmount: document.outstandingAmount,
  }))

  const loading =
    salesQuery.isLoading || purchasesQuery.isLoading || partiesQuery.isLoading

  return (
    <Screen
      title="Payments"
      subtitle="Customer receipts and supplier payments against open documents"
      variant={variant}
    >
      <View className="flex-row gap-2">
        <TabChip
          label="Receipts"
          active={mode === 'receipts'}
          onPress={() => setMode('receipts')}
        />
        <TabChip
          label="Payments"
          active={mode === 'payments'}
          onPress={() => setMode('payments')}
        />
      </View>

      <PrimaryButton
        label={mode === 'receipts' ? 'Receive payment' : 'Make payment'}
        onPress={() => {
          setError(null)
          setDraft(createInitialDraft())
          setModalOpen(true)
        }}
      />

      <View className="gap-section-header">
        <SectionHeader title="Open balances" compact icon="wallet-outline" />
        {loading ? <LoadingState /> : null}
        {!loading && list.length === 0 ? (
          <EmptyState message="No open documents." />
        ) : null}
        {list.map((document) => (
          <CardRow
            key={document.id}
            title={document.label}
            subtitle={partyNameById(document.partyId)}
            amount={formatInr(document.outstandingAmount)}
            badge={document.paymentStatus}
          />
        ))}
      </View>

      <AllocationModal
        visible={modalOpen}
        mode={mode}
        documents={modalDocuments}
        partyName={(documentId) => {
          const document = list.find((entry) => entry.id === documentId)
          return document ? partyNameById(document.partyId) : '—'
        }}
        draft={draft}
        onChange={setDraft}
        onClose={() => setModalOpen(false)}
        onSubmit={() => allocationMutation.mutate()}
        submitting={allocationMutation.isPending}
        error={error}
      />
    </Screen>
  )
}
