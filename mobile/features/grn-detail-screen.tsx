import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { CardRow } from '@/components/data/card-row'
import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton } from '@/components/ui/button'
import { formatInr, formatShortDate } from '@/lib/format-inr'
import { computeLineAmount } from '@/lib/document-lines'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function GrnDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const { companyId } = useWorkspace()

  const grnQuery = useQuery({
    queryKey: ['purchase-grn', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: () =>
      trpcClient.purchaseGrns.getById.query({
        companyId: companyId!,
        grnId: id!,
      }),
  })

  const grn = grnQuery.data

  if (grnQuery.isLoading) {
    return (
      <Screen title="Goods receipt">
        <LoadingState />
      </Screen>
    )
  }

  if (!grn) {
    return (
      <Screen title="Goods receipt">
        <EmptyState message="GRN not found or unavailable." />
      </Screen>
    )
  }

  return (
    <Screen title={grn.grnNumber} subtitle="Goods receipt note">
      <DetailCard title="Summary" icon="information-circle-outline">
        <DetailRow label="Date" value={formatShortDate(grn.grnDate)} />
        <DetailRow label="Status" value={grn.status} />
        {grn.godownName ? (
          <DetailRow label="Godown" value={grn.godownName} />
        ) : null}
        {grn.narration ? (
          <DetailRow label="Note" value={grn.narration} />
        ) : null}
      </DetailCard>

      <DetailCard title="Totals" icon="calculator-outline">
        <DetailRow label="Items" value={String(grn.lines.length)} />
        <DetailRow label="Total" value={formatInr(grn.totalAmount)} />
      </DetailCard>

      <View className="gap-section-header">
        <SectionHeader title="Line items" compact icon="list-outline" />
        {grn.lines.map((line) => {
          const lineAmount = computeLineAmount(line.quantity, line.rate)

          return (
            <CardRow
              key={line.id}
              title={line.description}
              subtitle={`${line.quantity} ${line.unit} × ${formatInr(line.rate)}`}
              amount={lineAmount ? formatInr(lineAmount) : undefined}
              badge={`GST ${line.gstRate}%`}
            />
          )
        })}
      </View>

      {grn.status === 'open' ? (
        <PrimaryButton
          label="Convert to purchase bill"
          onPress={() =>
            router.push({
              pathname: '/(app)/purchases/new',
              params: { fromGrn: grn.id },
            } as never)
          }
        />
      ) : null}
    </Screen>
  )
}
