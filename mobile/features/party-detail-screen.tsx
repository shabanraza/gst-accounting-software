import * as React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useLocalSearchParams, useRouter } from 'expo-router'

import { DetailCard } from '@/components/data/detail-card'
import { DetailRow } from '@/components/data/detail-row'
import { EmptyState } from '@/components/data/empty-state'
import { LoadingState } from '@/components/data/loading-state'
import { Screen } from '@/components/layout/screen'
import { PrimaryButton, SecondaryButton } from '@/components/ui/button'
import { partyTypeLabel, stateLabel } from '@/lib/india-masters'
import { pageLayout } from '@/lib/spacing'
import { trpcClient } from '@/lib/trpc-client'
import { Text, View } from '@/tw'
import { useWorkspace } from '@/lib/workspace'

export function PartyDetailScreen() {
  const router = useRouter()
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

  const party = partyQuery.data

  if (partyQuery.isLoading) {
    return (
      <Screen title="Party">
        <LoadingState />
      </Screen>
    )
  }

  if (partyQuery.isError || !party) {
    return (
      <Screen title="Party">
        <EmptyState message="Party not found or unavailable." />
      </Screen>
    )
  }

  const address = [party.addressLine1, party.addressLine2, party.city, party.pincode]
    .filter(Boolean)
    .join(', ')

  return (
    <Screen title={party.name} subtitle={partyTypeLabel(party.partyType)}>
      <View style={{ gap: pageLayout.sectionGap }}>
        <DetailCard title="Tax & state" icon="document-text-outline">
          <DetailRow label="GSTIN" value={party.gstin ?? 'Unregistered'} />
          <DetailRow label="PAN" value={party.pan?.trim() || '—'} />
          <DetailRow label="State" value={stateLabel(party.stateCode)} />
        </DetailCard>

        {address ? (
          <DetailCard title="Address" icon="location-outline">
            <Text className="text-sm text-foreground">{address}</Text>
          </DetailCard>
        ) : null}

        <DetailCard title="Contact" icon="call-outline">
          <DetailRow label="Phone" value={party.contactPhone?.trim() || '—'} />
          <DetailRow label="Email" value={party.contactEmail?.trim() || '—'} />
        </DetailCard>

        <DetailCard title="Credit" icon="wallet-outline">
          <DetailRow
            label="Payment terms"
            value={`${party.paymentTermsDays} days`}
          />
          <DetailRow
            label="Credit limit"
            value={party.creditLimit?.trim() || '—'}
          />
        </DetailCard>

        <PrimaryButton
          label="Edit party"
          onPress={() =>
            router.push(`/(app)/parties/${party.id}/edit` as never)
          }
        />
        <SecondaryButton label="Back" onPress={() => router.back()} />
      </View>
    </Screen>
  )
}
