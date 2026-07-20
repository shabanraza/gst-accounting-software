import { useQuery } from '@tanstack/react-query'
import * as Linking from 'expo-linking'

import { CardRow } from '@/components/data/card-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { SectionHeader } from '@/components/layout/section-header'
import { Screen } from '@/components/layout/screen'
import { useLedgerAccounts } from '@/features/use-ledger-accounts'
import { trpcClient } from '@/lib/trpc-client'
import { View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

const PRIVACY_POLICY_URL = 'https://hisaabkro.in/privacy'
const DATA_DELETION_URL = 'https://hisaabkro.in/data-deletion'

export function ChartOfAccountsScreen() {
  const { companyId } = useWorkspace()
  const ledgersQuery = useLedgerAccounts()

  const accounts = ledgersQuery.data ?? []

  return (
    <Screen title="Chart of accounts" subtitle="Ledger accounts">
      {ledgersQuery.isLoading ? <LoadingState /> : null}
      {ledgersQuery.isError ? (
        <EmptyState message="Unable to load ledger accounts." />
      ) : null}

      <View className="gap-section-header">
        <SectionHeader title="Accounts" compact icon="library-outline" />
        {accounts.map((account) => (
          <CardRow
            key={account.id}
            title={account.name}
            subtitle={account.code}
            badge={account.accountType}
          />
        ))}
        {accounts.length === 0 && !ledgersQuery.isLoading ? (
          <EmptyState message="No ledger accounts yet." />
        ) : null}
      </View>
    </Screen>
  )
}

export function SettingsScreen() {
  const { companyId } = useWorkspace()

  const teamQuery = useQuery({
    queryKey: ['team-members', companyId],
    enabled: Boolean(companyId),
    queryFn: () =>
      trpcClient.team.listMembers.query({
        companyId: companyId!,
      }),
  })

  return (
    <Screen title="Settings" subtitle="Team and workspace">
      {teamQuery.isLoading ? <LoadingState /> : null}

      <View className="gap-section-header">
        <SectionHeader title="Team members" compact icon="people-outline" />
        {(teamQuery.data?.members ?? []).map((member) => (
          <CardRow
            key={member.userId}
            title={member.name ?? member.email ?? member.userId}
            subtitle={member.email ?? undefined}
            badge={member.role}
          />
        ))}
        {(teamQuery.data?.invitations ?? []).map((invitation) => (
          <CardRow
            key={invitation.email}
            title={invitation.email}
            subtitle="Pending invite"
            badge={invitation.role}
          />
        ))}
        {teamQuery.isError ? (
          <EmptyState message="Team list requires manage access." />
        ) : null}
      </View>
      <View className="gap-section-header">
        <SectionHeader
          title="Privacy and data"
          compact
          icon="shield-checkmark-outline"
        />
        <CardRow
          title="Privacy policy"
          subtitle="How HisaabKro handles account and business data"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
        />
        <CardRow
          title="Request data deletion"
          subtitle="Delete your account and associated workspace data"
          onPress={() => void Linking.openURL(DATA_DELETION_URL)}
        />
      </View>
    </Screen>
  )
}
