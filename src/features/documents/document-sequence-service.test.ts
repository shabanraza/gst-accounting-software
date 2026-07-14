import { describe, expect, test } from 'vitest'

import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import type {
  DocumentSequenceRecord,
  DocumentSequenceRepository,
} from '#/features/documents/document-sequence-service.ts'

class InMemoryDocumentSequenceRepository implements DocumentSequenceRepository {
  private sequences: Array<DocumentSequenceRecord> = []

  async findForUpdate(input: {
    companyId: string
    financialYearId: string
    voucherType: string
    series: string
  }) {
    return (
      this.sequences.find(
        (sequence) =>
          sequence.companyId === input.companyId &&
          sequence.financialYearId === input.financialYearId &&
          sequence.voucherType === input.voucherType &&
          sequence.series === input.series,
      ) ?? null
    )
  }

  async save(sequence: DocumentSequenceRecord) {
    const index = this.sequences.findIndex((item) => item.id === sequence.id)
    if (index >= 0) {
      this.sequences[index] = sequence
    } else {
      this.sequences.push(sequence)
    }
    return sequence
  }
}

describe('nextDocumentNumber', () => {
  test('allocates safe sequential invoice numbers without COUNT(*)', async () => {
    const repository = new InMemoryDocumentSequenceRepository()

    const first = await nextDocumentNumber(repository, {
      companyId: 'company-1',
      financialYearId: 'fy-1',
      voucherType: 'sales_invoice',
      series: 'INV',
      padLength: 4,
    })

    const second = await nextDocumentNumber(repository, {
      companyId: 'company-1',
      financialYearId: 'fy-1',
      voucherType: 'sales_invoice',
      series: 'INV',
      padLength: 4,
    })

    expect(first).toBe('INV-0001')
    expect(second).toBe('INV-0002')
  })

  test('keeps sequences isolated by company, year, voucher type, and series', async () => {
    const repository = new InMemoryDocumentSequenceRepository()

    const sales = await nextDocumentNumber(repository, {
      companyId: 'company-1',
      financialYearId: 'fy-1',
      voucherType: 'sales_invoice',
      series: 'INV',
    })

    const purchase = await nextDocumentNumber(repository, {
      companyId: 'company-1',
      financialYearId: 'fy-1',
      voucherType: 'purchase_bill',
      series: 'PUR',
    })

    const otherCompany = await nextDocumentNumber(repository, {
      companyId: 'company-2',
      financialYearId: 'fy-1',
      voucherType: 'sales_invoice',
      series: 'INV',
    })

    expect(sales).toBe('INV-1')
    expect(purchase).toBe('PUR-1')
    expect(otherCompany).toBe('INV-1')
  })
})
