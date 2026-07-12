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

export interface GodownRepository {
  findByCompanyAndName: (
    companyId: string,
    name: string,
  ) => Promise<GodownRecord | null>
  create: (godown: GodownRecord) => Promise<GodownRecord>
  listByCompanyId: (companyId: string) => Promise<Array<GodownRecord>>
}

export class DuplicateGodownNameError extends Error {
  constructor(name: string) {
    super(`Godown already exists for this company: ${name}`)
    this.name = 'DuplicateGodownNameError'
  }
}

export class InvalidGodownError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidGodownError'
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

  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    name,
    isDefault: input.isDefault ?? false,
    createdAt: new Date(),
  })
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
    return existing
  }

  const godown = await createGodown(repository, {
    companyId,
    name: DEFAULT_GODOWN_NAME,
    isDefault: true,
  })

  return [godown]
}
