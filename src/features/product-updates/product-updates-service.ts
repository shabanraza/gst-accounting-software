export type StoredPreference = {
  productUpdates: boolean
  consentedAt: Date | null
  withdrawnAt: Date | null
}

export type ProductUpdatesPreference = {
  enabled: boolean
  consentedAt: Date | null
}

export interface PreferenceStore {
  get: (userId: string) => Promise<StoredPreference | null>
  save: (userId: string, preference: StoredPreference) => Promise<void>
}

/** The mailing list product updates are sent to (a Resend segment). */
export interface ProductUpdatesAudience {
  subscribe: (contact: { email: string; name: string }) => Promise<void>
  unsubscribe: (email: string) => Promise<void>
  isSubscribed: (email: string) => Promise<boolean>
}

type PreferenceUser = { id: string; email: string; name: string }

const toPreference = (row: StoredPreference): ProductUpdatesPreference => ({
  enabled: row.productUpdates,
  consentedAt: row.consentedAt,
})

/**
 * Opt-in consent for product-update emails. The audience is updated before the
 * stored preference so the two never disagree in the subscribed direction, and
 * an unsubscribe made in Resend always wins: the app only resubscribes when the
 * user turns the switch back on.
 */
export function createProductUpdatesService(deps: {
  store: PreferenceStore
  audience: ProductUpdatesAudience | null
  now?: () => Date
}) {
  const now = deps.now ?? (() => new Date())

  async function getPreference(
    user: PreferenceUser,
  ): Promise<ProductUpdatesPreference> {
    const row = await deps.store.get(user.id)
    if (!row) return { enabled: false, consentedAt: null }
    if (!row.productUpdates || !deps.audience) return toPreference(row)

    let subscribed: boolean
    try {
      subscribed = await deps.audience.isSubscribed(user.email)
    } catch {
      return toPreference(row)
    }
    if (subscribed) return toPreference(row)

    const withdrawn = { ...row, productUpdates: false, withdrawnAt: now() }
    await deps.store.save(user.id, withdrawn)
    return toPreference(withdrawn)
  }

  async function setPreference(
    user: PreferenceUser,
    enabled: boolean,
  ): Promise<ProductUpdatesPreference> {
    const row = await deps.store.get(user.id)

    if (deps.audience) {
      if (enabled) {
        await deps.audience.subscribe({ email: user.email, name: user.name })
      } else {
        await deps.audience.unsubscribe(user.email)
      }
    }

    const alreadyOn = row?.productUpdates === true
    const next: StoredPreference = enabled
      ? {
          productUpdates: true,
          consentedAt: alreadyOn ? row.consentedAt : now(),
          withdrawnAt: null,
        }
      : {
          productUpdates: false,
          consentedAt: row?.consentedAt ?? null,
          withdrawnAt: now(),
        }
    await deps.store.save(user.id, next)
    return toPreference(next)
  }

  return { getPreference, setPreference }
}

export type ProductUpdatesService = ReturnType<
  typeof createProductUpdatesService
>
