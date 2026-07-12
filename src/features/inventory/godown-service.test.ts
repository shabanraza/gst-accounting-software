import { describe, expect, test } from 'vitest'

import {
  DuplicateGodownNameError,
  createGodown,
  ensureDefaultGodowns,
} from '#/features/inventory/godown-service.ts'
import { InMemoryGodownRepository } from '#/features/inventory/godown-store.ts'

describe('createGodown', () => {
  test('creates a godown for a company', async () => {
    const repository = new InMemoryGodownRepository()

    const godown = await createGodown(repository, {
      companyId: 'company-1',
      name: 'Main Godown',
    })

    expect(godown.name).toBe('Main Godown')
    expect(godown.companyId).toBe('company-1')
    expect(godown.isDefault).toBe(false)
  })

  test('rejects duplicate godown names within a company', async () => {
    const repository = new InMemoryGodownRepository()

    await createGodown(repository, {
      companyId: 'company-1',
      name: 'Main Godown',
    })

    await expect(
      createGodown(repository, {
        companyId: 'company-1',
        name: 'Main Godown',
      }),
    ).rejects.toBeInstanceOf(DuplicateGodownNameError)
  })
})

describe('ensureDefaultGodowns', () => {
  test('creates a default godown when none exist', async () => {
    const repository = new InMemoryGodownRepository()

    const godowns = await ensureDefaultGodowns(repository, 'company-1')

    expect(godowns).toHaveLength(1)
    expect(godowns[0]?.name).toBe('Main Godown')
    expect(godowns[0]?.isDefault).toBe(true)
  })

  test('is idempotent when godowns already exist', async () => {
    const repository = new InMemoryGodownRepository()

    await ensureDefaultGodowns(repository, 'company-1')
    const second = await ensureDefaultGodowns(repository, 'company-1')

    expect(second).toHaveLength(1)
    expect(await repository.listByCompanyId('company-1')).toHaveLength(1)
  })
})
