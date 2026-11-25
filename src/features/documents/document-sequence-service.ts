export type DocumentSequenceScope = {
  companyId: string
  financialYearId: string
  voucherType: string
  series: string
}

export interface DocumentSequenceRepository {
  /** Atomically reserves the next number in the scope and returns it. */
  allocateNext: (scope: DocumentSequenceScope) => Promise<number>
}

export type NextDocumentNumberInput = DocumentSequenceScope & {
  padLength?: number
}

export async function nextDocumentNumber(
  repository: DocumentSequenceRepository,
  input: NextDocumentNumberInput,
): Promise<string> {
  const value = await repository.allocateNext(input)
  return formatDocumentNumber(input.series, value, input.padLength)
}

function formatDocumentNumber(series: string, value: number, padLength = 0) {
  const numberPart =
    padLength > 0 ? String(value).padStart(padLength, '0') : String(value)
  return `${series}-${numberPart}`
}
