import { eq } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  PreferenceStore,
  StoredPreference,
} from '#/features/product-updates/product-updates-service.ts'

class InMemoryPreferenceStore implements PreferenceStore {
  private readonly rows = new Map<string, StoredPreference>()

  async get(userId: string) {
    return this.rows.get(userId) ?? null
  }

  async save(userId: string, preference: StoredPreference) {
    this.rows.set(userId, preference)
  }
}

class DrizzlePreferenceStore implements PreferenceStore {
  constructor(private readonly database: AppDatabase) {}

  async get(userId: string) {
    const rows = await this.database
      .select({
        productUpdates: schema.userPreferences.productUpdates,
        consentedAt: schema.userPreferences.productUpdatesConsentedAt,
        withdrawnAt: schema.userPreferences.productUpdatesWithdrawnAt,
        promptedAt: schema.userPreferences.productUpdatesPromptedAt,
      })
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, userId))
    return rows.at(0) ?? null
  }

  async save(userId: string, preference: StoredPreference) {
    const values = {
      productUpdates: preference.productUpdates,
      productUpdatesConsentedAt: preference.consentedAt,
      productUpdatesWithdrawnAt: preference.withdrawnAt,
      productUpdatesPromptedAt: preference.promptedAt ?? null,
      updatedAt: new Date(),
    }
    await this.database
      .insert(schema.userPreferences)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: schema.userPreferences.userId, set: values })
  }
}

function createPreferenceStore(): PreferenceStore {
  const database = getDb()
  if (!database) return new InMemoryPreferenceStore()
  return new DrizzlePreferenceStore(database)
}

export const preferenceStore = createPreferenceStore()
