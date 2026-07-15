import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { SectionHeader } from '@/components/section-header'
import {
  CardRow,
  EmptyState,
  LoadingState,
  Screen,
} from '@/components/screen'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import {
  salesInvoiceSummaryRows,
  salesInvoiceTotalsRows,
} from '@/lib/sales-invoice-detail'
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

export function SalesInvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId } = useWorkspace()

  const invoiceQuery = useQuery({
    queryKey: ['sales-invoice', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: () =>
      trpcClient.sales.getById.query({
        companyId: companyId!,
        id: id!,
      }),
  })

  const invoice = invoiceQuery.data

  return (
    <Screen
      title={invoice?.invoiceNumber ?? 'Invoice'}
      subtitle={
        invoice?.invoiceDate
          ? formatShortDate(invoice.invoiceDate.slice(0, 10))
          : 'Sales invoice'
      }
    >
      {invoiceQuery.isLoading ? <LoadingState /> : null}
      {invoiceQuery.isError ? (
        <EmptyState message="Unable to load this invoice." />
      ) : null}
      {invoice ? (
        <>
          <DetailCard title="Summary" icon="information-circle-outline">
            {salesInvoiceSummaryRows(invoice).map((row) => (
              <DetailRow key={row.label} label={row.label} value={row.value} />
            ))}
          </DetailCard>
          <DetailCard title="Totals" icon="calculator-outline">
            {salesInvoiceTotalsRows(invoice).map((row) => (
              <DetailRow
                key={row.label}
                label={row.label}
                value={formatInr(row.value)}
              />
            ))}
          </DetailCard>
          <View className="gap-section-header">
            <SectionHeader title="Line items" compact icon="list-outline" />
            {invoice.lines.map((line, index) => (
              <CardRow
                key={`${line.description}-${index}`}
                title={line.description}
                subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
                amount={formatInr(line.lineAmount)}
                badge={`GST ${line.gstRate}%`}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  )
}
