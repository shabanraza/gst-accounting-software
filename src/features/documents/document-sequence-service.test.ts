import { describe, expect, test } from 'vitest'

import { nextDocumentNumber } from '#/features/documents/document-sequence-service.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'

import type { DocumentSequenceRepository } from '#/features/documents/document-sequence-service.ts'

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

  test('reserves each number with one atomic allocation call', async () => {
    const allocations: Array<string> = []
    let next = 7
    const repository: DocumentSequenceRepository = {
      allocateNext: async (input) => {
        allocations.push(input.series)
        return next++
      },
    }

    const [first, second] = await Promise.all([
      nextDocumentNumber(repository, {
        companyId: 'company-1',
        financialYearId: 'fy-1',
        voucherType: 'sales_invoice',
        series: 'INV',
      }),
      nextDocumentNumber(repository, {
        companyId: 'company-1',
        financialYearId: 'fy-1',
        voucherType: 'sales_invoice',
        series: 'INV',
      }),
    ])

    expect(allocations).toEqual(['INV', 'INV'])
    expect([first, second]).toEqual(['INV-7', 'INV-8'])
  })
})
