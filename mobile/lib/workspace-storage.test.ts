import { beforeEach, describe, expect, it, vi } from 'vitest'

const storage = new Map<string, string>()

import {
  clearWorkspaceStorage,
  readPreferredCompanyId,
  writePreferredCompanyId,
} from './workspace-storage.ts'
import { WORKSPACE_COMPANY_KEY } from './env.ts'

describe('workspace-storage', () => {
  beforeEach(() => {
    storage.clear()
    vi.stubEnv('EXPO_OS', 'web')
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
      },
      removeItem: (key: string) => {
        storage.delete(key)
      },
    })
  })

  it('persists the preferred company id on web', async () => {
    await writePreferredCompanyId('company-1')

    await expect(readPreferredCompanyId()).resolves.toBe('company-1')
    expect(storage.get(WORKSPACE_COMPANY_KEY)).toBe('company-1')
  })

  it('clears the preferred company id on web', async () => {
    await writePreferredCompanyId('company-1')
    await clearWorkspaceStorage()

    await expect(readPreferredCompanyId()).resolves.toBeNull()
  })
})
