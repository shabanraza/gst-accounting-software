import { useQuery } from '@tanstack/react-query'

import { CardRow, EmptyState, LoadingState, Screen } from '@/components/screen'
import { CompanySwitcher } from '@/components/company-switcher'
import { formatInr } from '@/lib/format-inr'
import { mapOwnerSnapshotCards } from '@/lib/dashboard-metrics'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export default function DashboardScreen() {
  const { companyId, companyStateCode } = useWorkspace()
  const snapshotQuery = useQuery({
    queryKey: ['dashboard', companyId, companyStateCode],
    enabled: Boolean(companyId && companyStateCode),
    queryFn: () =>
      trpcClient.dashboard.getOwnerSnapshot.query({
        companyId: companyId!,
        companyStateCode: companyStateCode!,
      }),
  })

  return (
    <Screen title="Dashboard" subtitle="Today's business pulse">
      <CompanySwitcher />
      {snapshotQuery.isLoading ? <LoadingState /> : null}
      {snapshotQuery.data
        ? mapOwnerSnapshotCards(snapshotQuery.data).map((card) => (
            <CardRow
              key={card.title}
              title={card.title}
              amount={formatInr(card.amount)}
              badge={card.badge}
            />
          ))
        : null}
      {!snapshotQuery.isLoading && !snapshotQuery.data ? (
        <EmptyState message="Dashboard metrics will appear once your company is ready." />
      ) : null}
    </Screen>
  )
}
