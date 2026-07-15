import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams } from 'expo-router'

import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { Screen } from '@/components/layout/screen'
import { PartyFormScreen } from '@/features/party-form-screen'
import { partyFormFromRecord } from '@/lib/party-form'
import { trpcClient } from '@/lib/trpc-client'
import { useWorkspace } from '@/lib/workspace'

export default function EditPartyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { companyId } = useWorkspace()

  const partyQuery = useQuery({
    queryKey: ['party-detail', companyId, id],
    enabled: Boolean(companyId && id),
    queryFn: async () => {
      const parties = await trpcClient.parties.list.query({
        companyId: companyId!,
      })
      const party = parties.find((entry) => entry.id === id)
      if (!party) {
        throw new Error('Party not found')
      }
      return party
    },
  })

  if (partyQuery.isLoading) {
    return (
      <Screen title="Edit party">
        <LoadingState />
      </Screen>
    )
  }

  if (partyQuery.isError || !partyQuery.data) {
    return (
      <Screen title="Edit party">
        <EmptyState message="Party not found or unavailable." />
      </Screen>
    )
  }

  return (
    <PartyFormScreen
      mode="edit"
      partyId={id}
      initialForm={partyFormFromRecord(partyQuery.data)}
    />
  )
}
