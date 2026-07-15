import * as React from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { SectionHeader } from '@/components/section-header'
import {
  CardRow,
  EmptyState,
  FormField,
  LoadingState,
  PrimaryButton,
  Screen,
} from '@/components/screen'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import {
  purchaseBillSummaryRows,
  purchaseBillTotalsRows,
} from '@/lib/purchase-bill-detail'
import {
  hasOutstandingBalance,
  validatePaymentAmount,
} from '@/lib/payment-allocation'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-2">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-sm font-medium text-foreground">{value}</Text>
    </View>
  )
}

function DetailCard({
  title,
  icon,
  children,
}: {
  title: string
  icon: import('@expo/vector-icons').Ionicons['name']
  children: React.ReactNode
}) {
  return (
    <View className="gap-section-header">
      <SectionHeader title={title} compact icon={icon} />
      <View className="rounded-xl border border-border bg-card p-card-padding">
        {children}
      </View>
    </View>
  )
}

export function PurchaseBillDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const { companyId, ledgerBySystemKey } = useWorkspace()
  const [amount, setAmount] = React.useState('')
  const [paymentError, setPaymentError] = React.useState<string | null>(null)
  const [paymentMessage, setPaymentMessage] = React.useState<string | null>(null)

  const billQuery = useQuery({
    queryKey: ['purchase-bill', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: () =>
      trpcClient.purchases.getById.query({
        companyId: companyId!,
        id: id!,
      }),
  })

  const bill = billQuery.data

  React.useEffect(() => {
    if (bill?.outstandingAmount && !amount) {
      setAmount(bill.outstandingAmount)
    }
  }, [amount, bill?.outstandingAmount])

  const paymentMutation = useMutation({
    mutationFn: async () => {
      if (!companyId || !bill) {
        throw new Error('Bill not loaded')
      }

      const validationError = validatePaymentAmount(
        amount,
        bill.outstandingAmount,
      )
      if (validationError) {
        throw new Error(validationError)
      }

      if (!ledgerBySystemKey.cash || !ledgerBySystemKey.supplier_payable) {
        throw new Error('Cash or payable ledger mapping is missing.')
      }

      return trpcClient.payments.allocateSupplierPayment.mutate({
        companyId,
        purchaseBillId: bill.id,
        amount,
        paymentDate: new Date().toISOString().slice(0, 10),
        cashAccountId: ledgerBySystemKey.cash,
        payableAccountId: ledgerBySystemKey.supplier_payable,
      })
    },
    onSuccess: async () => {
      setPaymentError(null)
      setPaymentMessage('Payment posted.')
      await queryClient.invalidateQueries({
        queryKey: ['purchase-bill', companyId, id],
      })
      await queryClient.invalidateQueries({ queryKey: ['module-list', 'purchases'] })
    },
    onError: (error) => {
      setPaymentMessage(null)
      setPaymentError(
        error instanceof Error ? error.message : 'Payment failed.',
      )
    },
  })

  return (
    <Screen
      title={bill?.supplierBillNumber ?? 'Purchase bill'}
      subtitle={
        bill?.billDate
          ? formatShortDate(bill.billDate.slice(0, 10))
          : 'Purchase bill'
      }
    >
      {billQuery.isLoading ? <LoadingState /> : null}
      {billQuery.isError ? (
        <EmptyState message="Unable to load this purchase bill." />
      ) : null}
      {bill ? (
        <>
          <DetailCard title="Summary" icon="information-circle-outline">
            {purchaseBillSummaryRows(bill).map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailCard>
          <DetailCard title="Totals" icon="calculator-outline">
            {purchaseBillTotalsRows(bill).map((row) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={formatInr(row.value)}
              />
            ))}
          </DetailCard>
          <View className="gap-section-header">
            <SectionHeader title="Line items" compact icon="list-outline" />
            {bill.lines.map((line, index) => (
              <CardRow
                key={`${line.description}-${index}`}
                title={line.description}
                subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
                amount={formatInr(line.lineTotal)}
                badge={`GST ${line.gstRate}%`}
              />
            ))}
          </View>
          {hasOutstandingBalance(bill.outstandingAmount) ? (
            <View className="gap-section-header">
              <SectionHeader title="Record payment" compact icon="card-outline" />
              <View className="gap-3 rounded-xl border border-border bg-card p-card-padding">
                <Text className="text-sm text-muted-foreground">
                  Outstanding {formatInr(bill.outstandingAmount)}
                </Text>
                <FormField
                  keyboardType="decimal-pad"
                  placeholder="Amount"
                  value={amount}
                  onChangeText={setAmount}
                />
                {paymentError ? (
                  <Text className="text-sm text-destructive">{paymentError}</Text>
                ) : null}
                {paymentMessage ? (
                  <Text className="text-sm text-muted-foreground">
                    {paymentMessage}
                  </Text>
                ) : null}
                <PrimaryButton
                  label={paymentMutation.isPending ? 'Posting…' : 'Post payment'}
                  loading={paymentMutation.isPending}
                  disabled={paymentMutation.isPending}
                  onPress={() => paymentMutation.mutate()}
                />
              </View>
            </View>
          ) : null}
        </>
      ) : null}
    </Screen>
  )
}
