import { inArray } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'

export type UserDirectoryEntry = {
  id: string
  name: string
  email: string
}

export interface UserDirectory {
  listByIds: (ids: Array<string>) => Promise<Array<UserDirectoryEntry>>
}

export class EmptyUserDirectory implements UserDirectory {
  async listByIds() {
    return []
  }
}

export class DrizzleUserDirectory implements UserDirectory {
  constructor(private readonly database: AppDatabase) {}

  async listByIds(ids: Array<string>) {
    if (ids.length === 0) return []
    const rows = await this.database
      .select({
        id: schema.user.id,
        name: schema.user.name,
        email: schema.user.email,
      })
      .from(schema.user)
      .where(inArray(schema.user.id, ids))

    return rows
  }
}

export function createUserDirectory(): UserDirectory {
  const database = getDb()
  if (!database) {
    return new EmptyUserDirectory()
  }
  return new DrizzleUserDirectory(database)
}

export const userDirectory = createUserDirectory()
