import { describe, expect, test } from 'vitest'

import {
  EInvoiceAlreadyGeneratedError,
  EWayBillAlreadyGeneratedError,
  generateEInvoice,
  generateEWayBill,
} from '#/features/gst/e-invoice-service.ts'
import {
  InMemoryEInvoiceRepository,
  InMemoryEWayBillRepository,
} from '#/features/gst/e-invoice-store.ts'

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

describe('generateEWayBill', () => {
  test('generates an e-way bill number valid for 24 hours', async () => {
    const repository = new InMemoryEWayBillRepository()

    const record = await generateEWayBill(repository, {
      companyId: 'company-1',
      salesInvoiceId: 'invoice-1',
      vehicleNumber: 'MH12AB1234',
    })

    expect(record.ewbNumber).toHaveLength(12)
    expect(record.vehicleNumber).toBe('MH12AB1234')
  })

  test('rejects generating a second e-way bill for the same sales invoice', async () => {
    const repository = new InMemoryEWayBillRepository()

    await generateEWayBill(repository, {
      companyId: 'company-1',
      salesInvoiceId: 'invoice-1',
    })

    await expect(
      generateEWayBill(repository, {
        companyId: 'company-1',
        salesInvoiceId: 'invoice-1',
      }),
    ).rejects.toBeInstanceOf(EWayBillAlreadyGeneratedError)
  })
})
