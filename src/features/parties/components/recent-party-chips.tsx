import * as React from 'react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  readRecentPartyIds,
  trackRecentParty,
} from '#/features/parties/recent-parties.ts'
import type { RecentPartyRole } from '#/features/parties/recent-parties.ts'

type PartyOption = {
  id: string
  name: string
}

export function useRecentParties(
  companyId: string | undefined,
  role: RecentPartyRole,
) {
  const [recentIds, setRecentIds] = React.useState<string[]>([])

  React.useEffect(() => {
    if (!companyId) {
      setRecentIds([])
      return
    }
    setRecentIds(readRecentPartyIds(companyId, role))
  }, [companyId, role])

  const rememberParty = React.useCallback(
    (partyId: string) => {
      if (!companyId) return
      trackRecentParty(companyId, role, partyId)
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
  createLabel,
  onCreateNew,
}: {
  parties: Array<PartyOption>
  recentIds: string[]
  selectedId?: string
  onSelect: (partyId: string) => void
  createLabel?: string
  onCreateNew?: () => void
}) {
  const recentParties = recentIds
    .map((id) => parties.find((party) => party.id === id))
    .filter((party): party is PartyOption => Boolean(party))

  if (recentParties.length === 0 && !onCreateNew) return null

  return (
    <div className="flex flex-col gap-2">
      {recentParties.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {recentParties.map((party) => (
            <Button
              key={party.id}
              onClick={() => onSelect(party.id)}
              size="sm"
              type="button"
              variant={selectedId === party.id ? 'default' : 'outline'}
            >
              {party.name}
            </Button>
          ))}
        </div>
      ) : null}
      {onCreateNew ? (
        <Button
          className="h-auto justify-start px-0 text-primary"
          onClick={onCreateNew}
          type="button"
          variant="link"
        >
          {createLabel ?? 'Add new party'}
        </Button>
      ) : null}
    </div>
  )
}

export function SupplyRegionBadge({ region }: { region: 'local' | 'central' }) {
  return (
    <Badge className="w-fit font-normal" variant="secondary">
      {region === 'local' ? 'Local (CGST+SGST)' : 'IGST'}
    </Badge>
  )
}
