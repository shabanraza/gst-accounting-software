import { describe, expect, test } from 'vitest'

import {
  InvalidSalesDocumentError,
  buildSalesInvoiceDraftFromDocument,
  createSalesDocument,
  listSalesDocumentsByCompany,
  markSalesDocumentConverted,
} from '#/features/sales-documents/sales-document-service.ts'
import { InMemorySalesDocumentRepository } from '#/features/sales-documents/sales-document-store.ts'
import { createItem } from '#/features/inventory/item-service.ts'
import { InMemoryItemRepository } from '#/features/inventory/inventory-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'

const sequences = new InMemoryDocumentSequenceRepository()

function quotationInput(
  overrides: Partial<Parameters<typeof createSalesDocument>[2]> = {},
) {
  return {
    companyId: 'company-1',
    financialYearId: 'fy-1',
    documentType: 'quotation' as const,
    documentDate: '2026-07-12',
    customerId: 'party-1',
    lines: [
      {
        itemId: 'item-1',
        description: 'Cotton Fabric',
        quantity: '1',
        unit: 'meter',
        rate: '120.00',
      },
    ],
    ...overrides,
  }
}

describe('createSalesDocument', () => {
  test('creates a quotation with a computed total', async () => {
    const repository = new InMemorySalesDocumentRepository()

    const document = await createSalesDocument(repository, sequences, {
      companyId: 'company-1',
      documentType: 'quotation',
      documentNumber: 'QTN-0001',
      documentDate: '2026-07-12',
      customerId: 'party-1',
      lines: [
        {
          itemId: 'item-1',
          description: 'Cotton Fabric',
          quantity: '10',
          unit: 'meter',
          rate: '120.00',
        },
      ],
    })

    expect(document.totalAmount).toBe('1200.00')
    expect(document.documentType).toBe('quotation')
  })

  test('numbers each document type from its own company sequence', async () => {
    const repository = new InMemorySalesDocumentRepository()
    const numbers = new InMemoryDocumentSequenceRepository()

    const first = await createSalesDocument(repository, numbers, quotationInput())
    const second = await createSalesDocument(
      repository,
      numbers,
      quotationInput(),
    )
    const order = await createSalesDocument(
      repository,
      numbers,
      quotationInput({ documentType: 'sales_order' }),
    )
    const challan = await createSalesDocument(
      repository,
      numbers,
      quotationInput({ documentType: 'delivery_challan' }),
    )
    const otherCompany = await createSalesDocument(
      repository,
      numbers,
      quotationInput({ companyId: 'company-2' }),
    )

    expect(first.documentNumber).toBe('QT-0001')
    expect(second.documentNumber).toBe('QT-0002')
    expect(order.documentNumber).toBe('SO-0001')
    expect(challan.documentNumber).toBe('DC-0001')
    expect(otherCompany.documentNumber).toBe('QT-0001')
  })

  test('keeps a number the user typed', async () => {
    const repository = new InMemorySalesDocumentRepository()
    const numbers = new InMemoryDocumentSequenceRepository()

    const typed = await createSalesDocument(
      repository,
      numbers,
      quotationInput({ documentNumber: ' Q/24/7 ' }),
    )
    const next = await createSalesDocument(repository, numbers, quotationInput())

    expect(typed.documentNumber).toBe('Q/24/7')
    expect(next.documentNumber).toBe('QT-0001')
  })

  test('continues the series the mobile app numbers from', async () => {
    const numbers = new InMemoryDocumentSequenceRepository()
    await numbers.allocateNext({
      companyId: 'company-1',
      financialYearId: 'fy-1',
      voucherType: 'sales',
      series: 'SO',
    })

    const order = await createSalesDocument(
      new InMemorySalesDocumentRepository(),
      numbers,
      quotationInput({ documentType: 'sales_order' }),
    )

    expect(order.documentNumber).toBe('SO-0002')
  })

  test('needs a financial year to number a document', async () => {
    await expect(
      createSalesDocument(
        new InMemorySalesDocumentRepository(),
        new InMemoryDocumentSequenceRepository(),
        quotationInput({ financialYearId: undefined }),
      ),
    ).rejects.toBeInstanceOf(InvalidSalesDocumentError)
  })

  test('rejects a document without lines', async () => {
    const repository = new InMemorySalesDocumentRepository()

    await expect(
      createSalesDocument(repository, sequences, {
        companyId: 'company-1',
        documentType: 'sales_order',
        documentNumber: 'SO-0001',
        documentDate: '2026-07-12',
        customerId: 'party-1',
        lines: [],
      }),
    ).rejects.toBeInstanceOf(InvalidSalesDocumentError)
  })
})

describe('listSalesDocumentsByCompany', () => {
  test('filters by document type when provided', async () => {
    const repository = new InMemorySalesDocumentRepository()
    await createSalesDocument(repository, sequences, {
      companyId: 'company-1',
      documentType: 'quotation',
      documentNumber: 'QTN-0001',
      documentDate: '2026-07-12',
      customerId: 'party-1',
      lines: [
        {
          itemId: 'item-1',
          description: 'Cotton Fabric',
          quantity: '5',
          unit: 'meter',
          rate: '120.00',
        },
      ],
    })
    await createSalesDocument(repository, sequences, {
      companyId: 'company-1',
      documentType: 'delivery_challan',
      documentNumber: 'DC-0001',
      documentDate: '2026-07-12',
      customerId: 'party-1',
      lines: [
        {
          itemId: 'item-1',
          description: 'Cotton Fabric',
          quantity: '5',
          unit: 'meter',
          rate: '120.00',
        },
      ],
    })

    const challans = await listSalesDocumentsByCompany(
      repository,
      'company-1',
      'delivery_challan',
    )

    expect(challans).toHaveLength(1)
    expect(challans[0]?.documentNumber).toBe('DC-0001')
  })
})

describe('buildSalesInvoiceDraftFromDocument', () => {
  test('maps document lines with item GST details', async () => {
    const documents = new InMemorySalesDocumentRepository()
    const items = new InMemoryItemRepository()

    const item = await createItem(items, {
      companyId: 'company-1',
      name: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '12.00',
      baseUnit: 'meter',
      purchaseRate: '90.00',
      saleRate: '120.00',
      tracksInventory: true,
    })

    const document = await createSalesDocument(documents, sequences, {
      companyId: 'company-1',
      documentType: 'quotation',
      documentNumber: 'QTN-0002',
      documentDate: '2026-07-12',
      customerId: 'party-1',
      lines: [
        {
          itemId: item.id,
          description: 'Cotton Fabric',
          quantity: '5',
          unit: 'meter',
          rate: '120.00',
        },
      ],
    })

    const draft = await buildSalesInvoiceDraftFromDocument(
      documents,
      items,
      'company-1',
      document.id,
    )

    expect(draft.customerId).toBe('party-1')
    expect(draft.lines[0]?.gstRate).toBe('12.00')
    expect(draft.lines[0]?.hsnCode).toBe('5208')
  })

  test('marks a document converted after invoicing', async () => {
    const documents = new InMemorySalesDocumentRepository()

    const document = await createSalesDocument(documents, sequences, {
      companyId: 'company-1',
      documentType: 'quotation',
      documentNumber: 'QTN-0003',
      documentDate: '2026-07-12',
      customerId: 'party-1',
      lines: [
        {
          itemId: 'item-1',
          description: 'Cotton Fabric',
          quantity: '1',
          unit: 'meter',
          rate: '120.00',
        },
      ],
    })

    const updated = await markSalesDocumentConverted(
      documents,
      'company-1',
      document.id,
      'invoice-1',
    )

    expect(updated.status).toBe('converted')
    expect(updated.convertedToInvoiceId).toBe('invoice-1')
  })
})
