import { useRouter } from 'expo-router'
import * as React from 'react'
import { Pressable } from 'react-native'

import { OptionChip } from '@/components/ui/chip'
import { readRecentPartyIds, trackRecentParty } from '@/lib/recent-parties'
import type { RecentPartyRole } from '@/lib/recent-parties'
import { Text, View } from '@/tw'

type PartyOption = {
  id: string
  name: string
}

export function useRecentParties(
  companyId: string | null | undefined,
  role: RecentPartyRole,
) {
  const [recentIds, setRecentIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!companyId) {
      setRecentIds([])
      return
    }

    let cancelled = false
    void readRecentPartyIds(companyId, role).then((ids) => {
      if (!cancelled) setRecentIds(ids)
    })

    return () => {
      cancelled = true
    }
  }, [companyId, role])

  const rememberParty = React.useCallback(
    async (partyId: string) => {
      if (!companyId) return
      await trackRecentParty(companyId, role, partyId)
      setRecentIds((current) =>
        [partyId, ...current.filter((id) => id !== partyId)].slice(0, 5),
      )
    },
    [companyId, role],
  )

  return { recentIds, rememberParty }
}

export function RecentPartyChips({
  parties,
  recentIds,
  selectedId,
  onSelect,
  createHref,
  createLabel,
}: {
  parties: Array<PartyOption>
  recentIds: string[]
  selectedId?: string
  onSelect: (partyId: string) => void
  createHref?: string
  createLabel?: string
}) {
  const router = useRouter()
  const recentParties = recentIds
    .map((id) => parties.find((party) => party.id === id))
    .filter((party): party is PartyOption => Boolean(party))

  if (recentParties.length === 0 && !createHref) return null

  return (
    <View className="gap-2">
      {recentParties.length > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {recentParties.map((party) => (
            <OptionChip
              key={party.id}
              active={selectedId === party.id}
              label={party.name}
              onPress={() => onSelect(party.id)}
            />
          ))}
        </View>
      ) : null}
      {createHref ? (
        <Pressable onPress={() => router.push(createHref as never)}>
          <Text className="text-sm font-medium text-primary">
            {createLabel ?? 'Add new party'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  )
}
