export type DocumentSequenceRecord = {
  id: string
  companyId: string
  financialYearId: string
  voucherType: string
  series: string
  nextNumber: number
  updatedAt: Date
}

export interface DocumentSequenceRepository {
  findForUpdate: (input: {
    companyId: string
    financialYearId: string
    voucherType: string
    series: string
  }) => Promise<DocumentSequenceRecord | null>
  save: (sequence: DocumentSequenceRecord) => Promise<DocumentSequenceRecord>
}

export type NextDocumentNumberInput = {
  companyId: string
  financialYearId: string
  voucherType: string
  series: string
  padLength?: number
}

export async function nextDocumentNumber(
  repository: DocumentSequenceRepository,
  input: NextDocumentNumberInput,
): Promise<string> {
  const existing = await repository.findForUpdate(input)
  const now = new Date()

  if (!existing) {
    await repository.save({
      id: crypto.randomUUID(),
      companyId: input.companyId,
      financialYearId: input.financialYearId,
      voucherType: input.voucherType,
      series: input.series,
      nextNumber: 2,
      updatedAt: now,
    })

    return formatDocumentNumber(input.series, 1, input.padLength)
  }

  const current = existing.nextNumber
  await repository.save({
    ...existing,
    nextNumber: current + 1,
    updatedAt: now,
  })

  return formatDocumentNumber(input.series, current, input.padLength)
}

function formatDocumentNumber(series: string, value: number, padLength = 0) {
  const numberPart =
    padLength > 0 ? String(value).padStart(padLength, '0') : String(value)
  return `${series}-${numberPart}`
}
