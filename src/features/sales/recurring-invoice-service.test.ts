import { beforeEach, describe, expect, test } from 'vitest'

import {
  InvalidRecurringInvoiceError,
  advanceRunDate,
  createRecurringInvoice,
  generateRecurringInvoice,
  isRecurringDue,
  setRecurringStatus,
} from '#/features/sales/recurring-invoice-service.ts'
import { InMemoryRecurringInvoiceRepository } from '#/features/sales/recurring-invoice-store.ts'

import type {
  PostSalesInvoiceInput,
  SalesInvoiceRecord,
} from '#/features/sales/sales-invoice-service.ts'
import type { RecurringInvoiceContext } from '#/features/sales/recurring-invoice-service.ts'

const companyId = crypto.randomUUID()
const customerId = crypto.randomUUID()
const itemId = crypto.randomUUID()

function sourceInvoice(
  overrides: Partial<SalesInvoiceRecord> = {},
): SalesInvoiceRecord {
  return {
    id: crypto.randomUUID(),
    companyId,
    customerId,
    invoiceNumber: 'TAX-0007',
    invoiceDate: '2026-01-31',
    placeOfSupply: '27',
    reverseCharge: false,
    paymentMode: 'credit',
    paymentStatus: 'Pending',
    taxMode: 'exclusive',
    narration: 'Monthly maintenance',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: 'Main',
    dueDate: '2026-02-15',
    poReference: 'PO-9',
    transportMode: '',
    vehicleNo: '',
    lrNumber: '',
    challanRef: '',
    status: 'posted',
    taxableAmount: '1000.00',
    totalGstAmount: '180.00',
    totalAmount: '1180.00',
    outstandingAmount: '1180.00',
    ledgerEntryId: crypto.randomUUID(),
    lines: [
      {
        id: crypto.randomUUID(),
        itemId,
        description: 'AMC visit',
        quantity: '1',
        unit: 'NOS',
        rate: '1000.00',
        gstRate: '18.00',
        discountPercent: '0.00',
        discountAmount: '0.00',
        taxableAmount: '1000.00',
        gstAmount: '180.00',
        lineTotal: '1180.00',
        godownName: 'Main',
      },
    ],
    createdAt: new Date(),
    partyNameSnapshot: 'Noor Retailers',
    partyGstinSnapshot: null,
    partyBillingAddressSnapshot: '',
    partyShippingAddressSnapshot: '',
    partyStateCodeSnapshot: '27',
    partyPhoneSnapshot: '',
    partyEmailSnapshot: '',
    ...overrides,
  } as SalesInvoiceRecord
}

const context: RecurringInvoiceContext = {
  company: {
    stateCode: '27',
    gstin: '27AABCS1234K1Z5',
    addressLine1: '1 Market Road',
    addressLine2: '',
    city: 'Pune',
    pincode: '411001',
  },
  financialYearId: crypto.randomUUID(),
  ledgers: {
    sales: 'sales-ledger',
    output_gst: 'output-gst-ledger',
    customer_receivable: 'receivable-ledger',
    cash: 'cash-ledger',
    cogs: 'cogs-ledger',
    stock_in_hand: 'stock-ledger',
  },
}

let repo: InMemoryRecurringInvoiceRepository
let posted: Array<PostSalesInvoiceInput & { series: string }>

function fakePost(
  input: Omit<PostSalesInvoiceInput, 'invoiceNumber'> & {
    series: string
    financialYearId: string
  },
) {
  posted.push({ ...input, invoiceNumber: '' })
  return Promise.resolve(
    sourceInvoice({
      invoiceNumber: `${input.series}-00${posted.length + 7}`,
      invoiceDate: input.invoiceDate,
    }),
  )
}

beforeEach(() => {
  repo = new InMemoryRecurringInvoiceRepository()
  posted = []
})

describe('advanceRunDate', () => {
  test('keeps the start day of the month, clamped to short months', () => {
    expect(advanceRunDate('2026-01-31', '2026-01-31', 'monthly')).toBe(
      '2026-02-28',
    )
    expect(advanceRunDate('2026-01-31', '2026-02-28', 'monthly')).toBe(
      '2026-03-31',
    )
    expect(advanceRunDate('2026-11-30', '2026-11-30', 'quarterly')).toBe(
      '2027-02-28',
    )
    expect(advanceRunDate('2028-02-29', '2028-02-29', 'yearly')).toBe(
      '2029-02-28',
    )
    expect(advanceRunDate('2026-12-29', '2026-12-29', 'weekly')).toBe(
      '2027-01-05',
    )
  })
})

describe('createRecurringInvoice', () => {
  test('copies the invoice into a template and keeps its due period', async () => {
    const invoice = sourceInvoice()
    const recurring = await createRecurringInvoice(repo, {
      companyId,
      invoice,
      frequency: 'monthly',
      startDate: '2026-02-28',
    })

    expect(recurring).toMatchObject({
      companyId,
      customerId,
      customerName: 'Noor Retailers',
      sourceInvoiceId: invoice.id,
      frequency: 'monthly',
      startDate: '2026-02-28',
      nextRunDate: '2026-02-28',
      endDate: null,
      dueDays: 15,
      status: 'active',
      totalAmount: '1180.00',
      generatedCount: 0,
    })
    expect(recurring.template).toMatchObject({
      series: 'TAX',
      customerStateCode: '27',
      paymentMode: 'credit',
      narration: 'Monthly maintenance',
      poReference: 'PO-9',
      lines: [
        {
          itemId,
          description: 'AMC visit',
          quantity: '1',
          rate: '1000.00',
          gstRate: '18.00',
          discountPercent: '0.00',
          godownName: 'Main',
        },
      ],
    })
    expect(await repo.listByCompanyId(companyId)).toHaveLength(1)
  })

  test('refuses a cancelled invoice, another company or a bad end date', async () => {
    await expect(
      createRecurringInvoice(repo, {
        companyId,
        invoice: sourceInvoice({ status: 'cancelled' }),
        frequency: 'monthly',
        startDate: '2026-02-28',
      }),
    ).rejects.toThrow('A cancelled invoice cannot repeat')
    await expect(
      createRecurringInvoice(repo, {
        companyId: crypto.randomUUID(),
        invoice: sourceInvoice(),
        frequency: 'monthly',
        startDate: '2026-02-28',
      }),
    ).rejects.toBeInstanceOf(InvalidRecurringInvoiceError)
    await expect(
      createRecurringInvoice(repo, {
        companyId,
        invoice: sourceInvoice(),
        frequency: 'monthly',
        startDate: '2026-02-28',
        endDate: '2026-02-01',
      }),
    ).rejects.toThrow('End date must be on or after the start date')
  })
})

describe('generateRecurringInvoice', () => {
  test('posts the next invoice and moves the schedule on', async () => {
    const recurring = await createRecurringInvoice(repo, {
      companyId,
      invoice: sourceInvoice(),
      frequency: 'monthly',
      startDate: '2026-01-31',
    })

    const result = await generateRecurringInvoice(repo, {
      companyId,
      recurringId: recurring.id,
      today: '2026-02-03',
      context,
      post: fakePost,
    })

    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({
      companyId,
      customerId,
      customerStateCode: '27',
      companyStateCode: '27',
      companyGstin: '27AABCS1234K1Z5',
      companyCity: 'Pune',
      invoiceDate: '2026-01-31',
      dueDate: '2026-02-15',
      series: 'TAX',
      financialYearId: context.financialYearId,
      salesAccountId: 'sales-ledger',
      outputGstAccountId: 'output-gst-ledger',
      receivableAccountId: 'receivable-ledger',
      cashAccountId: 'cash-ledger',
      cogsAccountId: 'cogs-ledger',
      stockAccountId: 'stock-ledger',
    })
    expect(posted[0].lines).toHaveLength(1)
    expect(result.recurring).toMatchObject({
      nextRunDate: '2026-02-28',
      generatedCount: 1,
      lastInvoiceNumber: result.invoice.invoiceNumber,
      lastInvoiceId: result.invoice.id,
      status: 'active',
    })
    expect((await repo.findById(companyId, recurring.id))?.nextRunDate).toBe(
      '2026-02-28',
    )
  })

  test('does not post before the run date or when paused', async () => {
    const recurring = await createRecurringInvoice(repo, {
      companyId,
      invoice: sourceInvoice(),
      frequency: 'monthly',
      startDate: '2026-03-31',
    })
    await expect(
      generateRecurringInvoice(repo, {
        companyId,
        recurringId: recurring.id,
        today: '2026-03-30',
        context,
        post: fakePost,
      }),
    ).rejects.toThrow('The next invoice is not due until 2026-03-31')

    await setRecurringStatus(repo, {
      companyId,
      id: recurring.id,
      status: 'paused',
    })
    await expect(
      generateRecurringInvoice(repo, {
        companyId,
        recurringId: recurring.id,
        today: '2026-04-30',
        context,
        post: fakePost,
      }),
    ).rejects.toThrow('This recurring invoice is paused')
    expect(posted).toEqual([])
  })

  test('ends after the last run inside the end date', async () => {
    const recurring = await createRecurringInvoice(repo, {
      companyId,
      invoice: sourceInvoice(),
      frequency: 'monthly',
      startDate: '2026-01-31',
      endDate: '2026-02-28',
    })
    const generate = () =>
      generateRecurringInvoice(repo, {
        companyId,
        recurringId: recurring.id,
        today: '2026-03-31',
        context,
        post: fakePost,
      })

    await generate()
    const second = await generate()
    expect(second.recurring.status).toBe('ended')
    expect(isRecurringDue(second.recurring, '2026-12-31')).toBe(false)
    await expect(generate()).rejects.toThrow('This recurring invoice has ended')
    expect(posted.map((input) => input.invoiceDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
    ])
  })

  test('needs the sales ledgers and a financial year', async () => {
    const recurring = await createRecurringInvoice(repo, {
      companyId,
      invoice: sourceInvoice(),
      frequency: 'monthly',
      startDate: '2026-01-31',
    })
    await expect(
      generateRecurringInvoice(repo, {
        companyId,
        recurringId: recurring.id,
        today: '2026-02-01',
        context: { ...context, ledgers: { sales: 'sales-ledger' } },
        post: fakePost,
      }),
    ).rejects.toThrow('Missing ledger mapping: output_gst')
  })
})

describe('isRecurringDue', () => {
  test('is due on or after the run date while active', async () => {
    const recurring = await createRecurringInvoice(repo, {
      companyId,
      invoice: sourceInvoice(),
      frequency: 'weekly',
      startDate: '2026-05-04',
    })
    expect(isRecurringDue(recurring, '2026-05-03')).toBe(false)
    expect(isRecurringDue(recurring, '2026-05-04')).toBe(true)
    const paused = await setRecurringStatus(repo, {
      companyId,
      id: recurring.id,
      status: 'paused',
    })
    expect(isRecurringDue(paused, '2026-05-10')).toBe(false)
  })
})
