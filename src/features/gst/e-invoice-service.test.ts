import { describe, expect, test } from 'vitest'

import {
  EInvoiceAlreadyGeneratedError,
  generateEInvoice,
} from '#/features/gst/e-invoice-service.ts'
import { InMemoryEInvoiceRepository } from '#/features/gst/e-invoice-store.ts'

describe('generateEInvoice', () => {
  test('generates an IRN and ack number for a sales invoice', async () => {
    const repository = new InMemoryEInvoiceRepository()

    const record = await generateEInvoice(repository, {
      companyId: 'company-1',
      salesInvoiceId: 'invoice-1',
      totalAmount: '1180.00',
    })

    expect(record.irn).toHaveLength(32)
    expect(record.ackNumber).toHaveLength(12)
    expect(record.qrCodeData).toContain(record.irn)
  })

  test('rejects generating a second e-invoice for the same sales invoice', async () => {
    const repository = new InMemoryEInvoiceRepository()

    await generateEInvoice(repository, {
      companyId: 'company-1',
      salesInvoiceId: 'invoice-1',
      totalAmount: '1180.00',
    })

    await expect(
      generateEInvoice(repository, {
        companyId: 'company-1',
        salesInvoiceId: 'invoice-1',
        totalAmount: '1180.00',
      }),
    ).rejects.toBeInstanceOf(EInvoiceAlreadyGeneratedError)
  })
})
