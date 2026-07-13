export type GodownRecord = {
  id: string
  companyId: string
  name: string
  isDefault: boolean
  createdAt: Date
}

export type CreateGodownInput = {
  companyId: string
  name: string
  isDefault?: boolean
}

export type UpdateGodownInput = {
  companyId: string
  godownId: string
  name: string
}

export interface GodownRepository {
  findById: (id: string) => Promise<GodownRecord | null>
  findByCompanyAndName: (
    companyId: string,
    name: string,
  ) => Promise<GodownRecord | null>
  create: (godown: GodownRecord) => Promise<GodownRecord>
  update: (godown: GodownRecord) => Promise<GodownRecord>
  delete: (id: string) => Promise<void>
  clearDefaultForCompany: (companyId: string) => Promise<void>
  listByCompanyId: (companyId: string) => Promise<Array<GodownRecord>>
}

export class DuplicateGodownNameError extends Error {
  constructor(name: string) {
    super(`Godown already exists for this company: ${name}`)
    this.name = 'DuplicateGodownNameError'
  }
}

export class GodownNotFoundError extends Error {
  constructor() {
    super('Godown not found')
    this.name = 'GodownNotFoundError'
  }
}

export class CannotDeleteDefaultGodownError extends Error {
  constructor() {
    super('Cannot delete the default godown')
    this.name = 'CannotDeleteDefaultGodownError'
  }
}

export class GodownInUseError extends Error {
  constructor(name: string) {
    super(`Godown is referenced by stock movements and cannot be deleted: ${name}`)
    this.name = 'GodownInUseError'
  }
}

export class CannotDeleteLastGodownError extends Error {
  constructor() {
    super('Cannot delete the only godown for this company')
    this.name = 'CannotDeleteLastGodownError'
  }
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export async function createGodown(
  repository: GodownRepository,
  input: CreateGodownInput,
): Promise<GodownRecord> {
  const name = normalizeName(input.name)

  if (!name) {
    throw new InvalidGodownError('Godown name is required')
  }

  const existing = await repository.findByCompanyAndName(
    input.companyId,
    name,
  )

  if (existing) {
    throw new DuplicateGodownNameError(name)
  }

  if (input.isDefault) {
    await repository.clearDefaultForCompany(input.companyId)
  }

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    name,
    isDefault: input.isDefault ?? false,
    createdAt: new Date(),
  })
}

export class InvalidGodownError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidGodownError'
  }
}

export async function updateGodown(
  repository: GodownRepository,
  input: UpdateGodownInput,
): Promise<GodownRecord> {
  const name = normalizeName(input.name)
  if (!name) {
    throw new InvalidGodownError('Godown name is required')
  }

  const existing = await repository.findById(input.godownId)
  if (!existing || existing.companyId !== input.companyId) {
    throw new GodownNotFoundError()
  }

  if (existing.name !== name) {
    const duplicate = await repository.findByCompanyAndName(
      input.companyId,
      name,
    )
    if (duplicate) {
      throw new DuplicateGodownNameError(name)
    }
  }

  return repository.update({ ...existing, name })
}

export async function deleteGodown(
  repository: GodownRepository,
  companyId: string,
  godownId: string,
  movements?: {
    listByCompanyId: (
      companyId: string,
    ) => Promise<Array<{ godownName: string | null }>>
  },
): Promise<void> {
  const existing = await repository.findById(godownId)
  if (!existing || existing.companyId !== companyId) {
    throw new GodownNotFoundError()
  }

  const all = await repository.listByCompanyId(companyId)
  if (all.length <= 1) {
    throw new CannotDeleteLastGodownError()
  }
  if (existing.isDefault) {
    throw new CannotDeleteDefaultGodownError()
  }

  if (movements) {
    const inUse = (await movements.listByCompanyId(companyId)).some(
      (movement) => movement.godownName === existing.name,
    )
    if (inUse) {
      throw new GodownInUseError(existing.name)
    }
  }

  await repository.delete(godownId)
}

export async function setDefaultGodown(
  repository: GodownRepository,
  companyId: string,
  godownId: string,
): Promise<GodownRecord> {
  const existing = await repository.findById(godownId)
  if (!existing || existing.companyId !== companyId) {
    throw new GodownNotFoundError()
  }

  await repository.clearDefaultForCompany(companyId)
  return repository.update({ ...existing, isDefault: true })
}

export async function listGodownsByCompany(
  repository: GodownRepository,
  companyId: string,
): Promise<Array<GodownRecord>> {
  return repository.listByCompanyId(companyId)
}

export const DEFAULT_GODOWN_NAME = 'Main Godown'

export async function ensureDefaultGodowns(
  repository: GodownRepository,
  companyId: string,
): Promise<Array<GodownRecord>> {
  const existing = await repository.listByCompanyId(companyId)

  if (existing.length > 0) {
    if (!existing.some((godown) => godown.isDefault)) {
      const promoted = await repository.update({
        ...existing[0],
        isDefault: true,
      })
      return existing.map((godown) =>
        godown.id === promoted.id ? promoted : godown,
      )
    }
    return existing
  }

  const godown = await createGodown(repository, {
    companyId,
    name: DEFAULT_GODOWN_NAME,
    isDefault: true,
  })

  return [godown]
}
