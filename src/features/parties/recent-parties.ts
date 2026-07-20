const MAX_RECENT = 5

export type RecentPartyRole = 'customer' | 'supplier'

function storageKey(companyId: string, role: RecentPartyRole) {
  return `recent-parties:${companyId}:${role}`
}

export function readRecentPartyIds(
  companyId: string,
  role: RecentPartyRole,
): string[] {
  if (typeof localStorage === 'undefined') return []

  const raw = localStorage.getItem(storageKey(companyId, role))
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string')
      : []
  } catch {
    return []
  }
}

export function trackRecentParty(
  companyId: string,
  role: RecentPartyRole,
  partyId: string,
) {
  if (typeof localStorage === 'undefined') return

  const current = readRecentPartyIds(companyId, role)
  const next = [partyId, ...current.filter((id) => id !== partyId)].slice(
    0,
    MAX_RECENT,
  )
  localStorage.setItem(storageKey(companyId, role), JSON.stringify(next))
}
