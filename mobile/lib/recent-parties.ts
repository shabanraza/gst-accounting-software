import { isExpoWeb } from '@/lib/platform'

const MAX_RECENT = 5

export type RecentPartyRole = 'customer' | 'supplier'

function storageKey(companyId: string, role: RecentPartyRole) {
  // SecureStore keys must be alphanumeric plus ".", "-", "_"
  return `recent-parties_${companyId}_${role}`
}

async function readRaw(key: string): Promise<string | null> {
  if (isExpoWeb()) {
    if (typeof localStorage === 'undefined') return null
    return localStorage.getItem(key)
  }

  const SecureStore = await import('expo-secure-store')
  return SecureStore.getItemAsync(key)
}

async function writeRaw(key: string, value: string) {
  if (isExpoWeb()) {
    localStorage.setItem(key, value)
    return
  }

  const SecureStore = await import('expo-secure-store')
  await SecureStore.setItemAsync(key, value)
}

export async function readRecentPartyIds(
  companyId: string,
  role: RecentPartyRole,
): Promise<string[]> {
  const raw = await readRaw(storageKey(companyId, role))
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

export async function trackRecentParty(
  companyId: string,
  role: RecentPartyRole,
  partyId: string,
) {
  const current = await readRecentPartyIds(companyId, role)
  const next = [partyId, ...current.filter((id) => id !== partyId)].slice(
    0,
    MAX_RECENT,
  )
  await writeRaw(storageKey(companyId, role), JSON.stringify(next))
}
