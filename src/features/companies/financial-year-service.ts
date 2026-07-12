export type FinancialYearRecord = {
  id: string
  companyId: string
  startDate: string
  endDate: string
  isActive: boolean
  createdAt: Date
}

export interface FinancialYearRepository {
  create: (financialYear: FinancialYearRecord) => Promise<FinancialYearRecord>
  listByCompanyId: (companyId: string) => Promise<Array<FinancialYearRecord>>
}

export function deriveFinancialYearEnd(startDate: string): string {
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(
    Date.UTC(
      start.getUTCFullYear() + 1,
      start.getUTCMonth(),
      start.getUTCDate() - 1,
    ),
  )
  return end.toISOString().slice(0, 10)
}

export async function createFinancialYear(
  repository: FinancialYearRepository,
  input: { companyId: string; startDate: string; isActive?: boolean },
): Promise<FinancialYearRecord> {
  return repository.create({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    startDate: input.startDate,
    endDate: deriveFinancialYearEnd(input.startDate),
    isActive: input.isActive ?? true,
    createdAt: new Date(),
  })
}
