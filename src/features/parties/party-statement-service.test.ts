import { describe, expect, test } from 'vitest'

import {
  InvalidStatementPeriodError,
  buildPartyStatement,
  partyStatementToCsv,
} from '#/features/parties/party-statement-service.ts'
import { PartyNotFoundError } from '#/features/parties/party-service.ts'

import type { LedgerEntryRecord } from '#/features/accounting/posting-engine.ts'
import type { PaymentVoucherRecord } from '#/features/payments/payment-voucher-service.ts'
import type { PartyOpeningBalanceRecord } from '#/features/parties/party-opening-balance-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type { PartyStatementDependencies } from '#/features/parties/party-statement-service.ts'
import type { PurchaseBillRecord } from '#/features/purchases/purchase-bill-service.ts'
import type { CreditDebitNoteRecord } from '#/features/returns/credit-debit-note-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'

const COMPANY = 'company-1'

function party(overrides: Partial<PartyRecord> = {}): PartyRecord {
  return {
    id: 'party-1',
    companyId: COMPANY,
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: null,
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 30,
    receivableAccountId: null,
    payableAccountId: null,
    priceListId: null,
    pan: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    pincode: '',
    contactPhone: '',
    contactEmail: '',
    billingAddress: '',
    shippingAddress: '',
    createdAt: new Date(),
    ...overrides,
  }
}

function invoice(overrides: Partial<SalesInvoiceRecord>): SalesInvoiceRecord {
  return {
    id: 'inv-1',
    companyId: COMPANY,
    customerId: 'party-1',
    invoiceNumber: 'INV-1',
    invoiceDate: '2026-01-05',
    paymentMode: 'credit',
    paymentStatus: 'Pending',
    status: 'posted',
    taxableAmount: '1000.00',
    totalGstAmount: '180.00',
    totalAmount: '1180.00',
    outstandingAmount: '1180.00',
    ledgerEntryId: 'entry-inv-1',
    lines: [],
    createdAt: new Date('2026-01-05T10:00:00Z'),
    ...overrides,
  } as SalesInvoiceRecord
}

function bill(overrides: Partial<PurchaseBillRecord>): PurchaseBillRecord {
  return {
    id: 'bill-1',
    companyId: COMPANY,
    supplierId: 'party-2',
    supplierBillNumber: 'SB-1',
    billDate: '2026-01-06',
    dueDate: '2026-02-05',
    paymentStatus: 'Pending',
    taxableAmount: '500.00',
    totalGstAmount: '90.00',
    totalAmount: '590.00',
    outstandingAmount: '590.00',
    ledgerEntryId: 'entry-bill-1',
    lines: [],
    createdAt: new Date('2026-01-06T10:00:00Z'),
    ...overrides,
  } as PurchaseBillRecord
}

function note(
  overrides: Partial<CreditDebitNoteRecord>,
): CreditDebitNoteRecord {
  return {
    id: 'note-1',
    companyId: COMPANY,
    noteType: 'credit',
    noteNumber: 'CN-1',
    noteDate: '2026-01-10',
    partyId: 'party-1',
    referenceDocumentId: 'inv-1',
    taxableAmount: '100.00',
    totalGstAmount: '18.00',
    totalAmount: '118.00',
    ledgerEntryId: 'entry-note-1',
    narration: '',
    createdAt: new Date('2026-01-10T10:00:00Z'),
    ...overrides,
  }
}

function voucher(
  overrides: Partial<PaymentVoucherRecord>,
): PaymentVoucherRecord {
  return {
    id: 'voucher-1',
    companyId: COMPANY,
    voucherNumber: 'RCT-0001',
    kind: 'receipt',
    partyId: 'party-1',
    voucherDate: '2026-01-20',
    mode: 'upi',
    cashBankAccountId: 'acc-bank',
    partyAccountId: 'acc-debtors',
    reference: '',
    amount: '500.00',
    unallocatedAmount: '0.00',
    narration: '',
    status: 'posted',
    ledgerEntryId: 'entry-voucher-1',
    cancelLedgerEntryId: null,
    createdAt: new Date('2026-01-20T10:00:00Z'),
    allocations: [
      {
        id: 'alloc-1',
        companyId: COMPANY,
        voucherId: 'voucher-1',
        documentType: 'sales_invoice',
        documentId: 'inv-1',
        documentNumber: 'INV-1',
        amount: '500.00',
        createdAt: new Date('2026-01-20T10:00:00Z'),
      },
    ],
    ...overrides,
  }
}

function legacyEntry(
  overrides: Partial<LedgerEntryRecord> & { amount: string },
): LedgerEntryRecord {
  const { amount, ...rest } = overrides
  return {
    id: 'legacy-1',
    companyId: COMPANY,
    entryDate: '2026-02-02',
    narration: 'Receipt against INV-1',
    voucherType: 'receipt',
    totalDebit: amount,
    totalCredit: amount,
    createdAt: new Date('2026-02-02T10:00:00Z'),
    lines: [],
    ...rest,
  }
}

function deps(data: {
  parties?: Array<PartyRecord>
  invoices?: Array<SalesInvoiceRecord>
  bills?: Array<PurchaseBillRecord>
  notes?: Array<CreditDebitNoteRecord>
  vouchers?: Array<PaymentVoucherRecord>
  entries?: Array<LedgerEntryRecord>
  openings?: Array<PartyOpeningBalanceRecord>
}): PartyStatementDependencies {
  const parties = data.parties ?? [party()]
  return {
    parties: {
      findById: async (id: string) =>
        parties.find((record) => record.id === id) ?? null,
    },
    invoices: {
      listByCompanyId: async (companyId: string) =>
        (data.invoices ?? []).filter(
          (record) => record.companyId === companyId,
        ),
    },
    bills: {
      listByCompanyId: async (companyId: string) =>
        (data.bills ?? []).filter((record) => record.companyId === companyId),
    },
    notes: {
      listByCompanyId: async (companyId: string) =>
        (data.notes ?? []).filter((record) => record.companyId === companyId),
    },
    vouchers: {
      listByCompanyId: async (
        companyId: string,
        options?: { partyId?: string; endDate?: string },
      ) =>
        (data.vouchers ?? []).filter(
          (record) =>
            record.companyId === companyId &&
            (!options?.partyId || record.partyId === options.partyId) &&
            (!options?.endDate || record.voucherDate <= options.endDate),
        ),
    },
    openingBalances: {
      findByPartyId: async (companyId: string, partyId: string) =>
        (data.openings ?? []).find(
          (record) =>
            record.companyId === companyId && record.partyId === partyId,
        ) ?? null,
    },
    postings: {
      listByCompanyId: async (companyId: string) =>
        (data.entries ?? []).filter((record) => record.companyId === companyId),
    },
  }
}

const period = { from: '2026-01-01', to: '2026-03-31' }

describe('buildPartyStatement', () => {
  test('lists invoices, returns and receipts with a running balance', async () => {
    const statement = await buildPartyStatement(
      deps({
        invoices: [invoice({ outstandingAmount: '680.00' })],
        notes: [note({})],
        vouchers: [voucher({})],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(
      statement.rows.map((row) => [
        row.date,
        row.kind,
        row.documentNumber,
        row.debit,
        row.credit,
        `${row.balance.amount} ${row.balance.side}`,
      ]),
    ).toEqual([
      ['2026-01-05', 'sales_invoice', 'INV-1', '1180.00', '0.00', '1180.00 Dr'],
      ['2026-01-10', 'credit_note', 'CN-1', '0.00', '118.00', '1062.00 Dr'],
      ['2026-01-20', 'receipt', 'RCT-0001', '0.00', '500.00', '562.00 Dr'],
    ])
    expect(statement.party).toEqual({ id: 'party-1', name: 'Noor Retailers' })
    expect(statement.openingBalance).toEqual({ amount: '0.00', side: 'Dr' })
    expect(statement.totalDebit).toBe('1180.00')
    expect(statement.totalCredit).toBe('618.00')
    expect(statement.closingBalance).toEqual({ amount: '562.00', side: 'Dr' })
  })

  test('rolls earlier transactions into the opening balance and drops later ones', async () => {
    const statement = await buildPartyStatement(
      deps({
        invoices: [
          invoice({ outstandingAmount: '680.00' }),
          invoice({
            id: 'inv-2',
            invoiceNumber: 'INV-2',
            invoiceDate: '2026-04-02',
            totalAmount: '200.00',
            outstandingAmount: '200.00',
          }),
        ],
        notes: [note({})],
        vouchers: [voucher({})],
      }),
      {
        companyId: COMPANY,
        partyId: 'party-1',
        from: '2026-01-15',
        to: '2026-03-31',
      },
    )

    expect(statement.openingBalance).toEqual({ amount: '1062.00', side: 'Dr' })
    expect(statement.rows.map((row) => row.documentNumber)).toEqual([
      'RCT-0001',
    ])
    expect(statement.closingBalance).toEqual({ amount: '562.00', side: 'Dr' })
  })

  test('leaves a receipt dated after the period out without inventing a settlement', async () => {
    const statement = await buildPartyStatement(
      deps({
        invoices: [invoice({ outstandingAmount: '680.00' })],
        vouchers: [voucher({ voucherDate: '2026-04-10' })],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(statement.rows.map((row) => row.kind)).toEqual(['sales_invoice'])
    expect(statement.closingBalance).toEqual({ amount: '1180.00', side: 'Dr' })
  })

  test('shows a cash sale as billed and paid on the same day', async () => {
    const statement = await buildPartyStatement(
      deps({
        invoices: [
          invoice({
            paymentMode: 'cash',
            paymentStatus: 'Paid',
            outstandingAmount: '0.00',
          }),
        ],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(
      statement.rows.map((row) => [
        row.kind,
        row.particulars,
        row.debit,
        row.credit,
      ]),
    ).toEqual([
      ['sales_invoice', 'Sales invoice', '1180.00', '0.00'],
      ['settlement', 'Paid at sale', '0.00', '1180.00'],
    ])
    expect(statement.closingBalance).toEqual({ amount: '0.00', side: 'Dr' })
  })

  test('dates receipts recorded before receipt vouchers from their ledger entries', async () => {
    const statement = await buildPartyStatement(
      deps({
        invoices: [
          invoice({ totalAmount: '1000.00', outstandingAmount: '600.00' }),
        ],
        entries: [
          legacyEntry({ amount: '400.00' }),
          legacyEntry({
            id: 'legacy-other',
            narration: 'Receipt against INV-9',
            amount: '250.00',
          }),
          legacyEntry({
            id: 'legacy-payment',
            voucherType: 'payment',
            narration: 'Payment against INV-1',
            amount: '75.00',
          }),
        ],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(
      statement.rows.map((row) => [
        row.date,
        row.kind,
        row.particulars,
        row.credit,
      ]),
    ).toEqual([
      ['2026-01-05', 'sales_invoice', 'Sales invoice', '0.00'],
      ['2026-02-02', 'settlement', 'Receipt against INV-1', '400.00'],
    ])
    expect(statement.closingBalance).toEqual({ amount: '600.00', side: 'Dr' })
  })

  test('keeps the balance equal to the amount due when an old receipt has no ledger entry', async () => {
    const statement = await buildPartyStatement(
      deps({
        invoices: [
          invoice({ totalAmount: '1000.00', outstandingAmount: '700.00' }),
        ],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(statement.rows.at(-1)).toMatchObject({
      date: '2026-01-05',
      kind: 'settlement',
      particulars: 'Settled against INV-1',
      credit: '300.00',
    })
    expect(statement.closingBalance).toEqual({ amount: '700.00', side: 'Dr' })
  })

  test('shows a supplier balance on the credit side and skips cancelled documents', async () => {
    const supplier = party({
      id: 'party-2',
      name: 'Tata Metals',
      partyType: 'supplier',
    })
    const statement = await buildPartyStatement(
      deps({
        parties: [supplier],
        bills: [bill({ outstandingAmount: '390.00' })],
        invoices: [
          invoice({
            customerId: 'party-2',
            status: 'cancelled',
            outstandingAmount: '0.00',
          }),
        ],
        vouchers: [
          voucher({
            id: 'pay-1',
            kind: 'payment',
            voucherNumber: 'PAY-0001',
            partyId: 'party-2',
            amount: '200.00',
            mode: 'bank',
            allocations: [
              {
                id: 'alloc-p1',
                companyId: COMPANY,
                voucherId: 'pay-1',
                documentType: 'purchase_bill',
                documentId: 'bill-1',
                documentNumber: 'SB-1',
                amount: '200.00',
                createdAt: new Date(),
              },
            ],
          }),
          voucher({
            id: 'pay-2',
            kind: 'payment',
            voucherNumber: 'PAY-0002',
            partyId: 'party-2',
            status: 'cancelled',
            allocations: [],
          }),
        ],
      }),
      { companyId: COMPANY, partyId: 'party-2', ...period },
    )

    expect(
      statement.rows.map((row) => [
        row.kind,
        row.documentNumber,
        row.debit,
        row.credit,
        row.particulars,
      ]),
    ).toEqual([
      ['purchase_bill', 'SB-1', '0.00', '590.00', 'Purchase bill'],
      [
        'payment',
        'PAY-0001',
        '200.00',
        '0.00',
        'Payment · Bank · against SB-1',
      ],
    ])
    expect(statement.openingBalance).toEqual({ amount: '0.00', side: 'Cr' })
    expect(statement.closingBalance).toEqual({ amount: '390.00', side: 'Cr' })
  })

  test('describes unadjusted money on a receipt as an advance', async () => {
    const statement = await buildPartyStatement(
      deps({
        vouchers: [
          voucher({
            amount: '300.00',
            unallocatedAmount: '300.00',
            mode: 'cash',
            allocations: [],
          }),
        ],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(statement.rows[0].particulars).toBe('Receipt · Cash · advance')
    expect(statement.closingBalance).toEqual({ amount: '300.00', side: 'Cr' })
  })

  test('starts with the opening balance and adjusts receipts against it', async () => {
    const opening: PartyOpeningBalanceRecord = {
      id: 'opening-1',
      companyId: COMPANY,
      partyId: 'party-1',
      side: 'receivable',
      asOfDate: '2025-04-01',
      amount: '5000.00',
      outstandingAmount: '4500.00',
      partyAccountId: 'acc-debtors',
      ledgerEntryId: 'entry-opening',
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const receipt = voucher({
      amount: '500.00',
      allocations: [
        {
          id: 'alloc-o',
          companyId: COMPANY,
          voucherId: 'voucher-1',
          documentType: 'party_opening',
          documentId: 'opening-1',
          documentNumber: 'Opening balance',
          amount: '500.00',
          createdAt: new Date(),
        },
      ],
    })

    const full = await buildPartyStatement(
      deps({ openings: [opening], vouchers: [receipt] }),
      {
        companyId: COMPANY,
        partyId: 'party-1',
        from: '2025-04-01',
        to: '2026-03-31',
      },
    )
    expect(
      full.rows.map((row) => [
        row.kind,
        row.particulars,
        row.debit,
        row.credit,
      ]),
    ).toEqual([
      ['receipt', 'Receipt · UPI · against Opening balance', '0.00', '500.00'],
    ])
    // A period starting on the opening date opens with the party's balance.
    expect(full.openingBalance).toEqual({ amount: '5000.00', side: 'Dr' })
    expect(full.closingBalance).toEqual({ amount: '4500.00', side: 'Dr' })

    const earlier = await buildPartyStatement(
      deps({ openings: [opening], vouchers: [receipt] }),
      {
        companyId: COMPANY,
        partyId: 'party-1',
        from: '2025-01-01',
        to: '2026-03-31',
      },
    )
    expect(earlier.rows[0]).toMatchObject({
      kind: 'opening_balance',
      debit: '5000.00',
    })

    const later = await buildPartyStatement(
      deps({ openings: [opening], vouchers: [receipt] }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )
    expect(later.openingBalance).toEqual({ amount: '5000.00', side: 'Dr' })
  })

  test('shows an amount owed to the party as a credit opening balance', async () => {
    const statement = await buildPartyStatement(
      deps({
        openings: [
          {
            id: 'opening-2',
            companyId: COMPANY,
            partyId: 'party-1',
            side: 'payable',
            asOfDate: '2025-04-01',
            amount: '700.00',
            outstandingAmount: '700.00',
            partyAccountId: 'acc-creditors',
            ledgerEntryId: 'entry-opening-2',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )
    expect(statement.openingBalance).toEqual({ amount: '700.00', side: 'Cr' })
  })

  test('refuses a party from another company', async () => {
    await expect(
      buildPartyStatement(
        deps({ parties: [party({ companyId: 'company-2' })] }),
        { companyId: COMPANY, partyId: 'party-1', ...period },
      ),
    ).rejects.toBeInstanceOf(PartyNotFoundError)
  })

  test('refuses a start date after the end date', async () => {
    await expect(
      buildPartyStatement(deps({}), {
        companyId: COMPANY,
        partyId: 'party-1',
        from: '2026-04-01',
        to: '2026-03-31',
      }),
    ).rejects.toBeInstanceOf(InvalidStatementPeriodError)
  })
})

describe('partyStatementToCsv', () => {
  test('writes opening, rows and closing with quoted text', async () => {
    const statement = await buildPartyStatement(
      deps({
        parties: [party({ name: 'Noor, Retailers' })],
        invoices: [invoice({ outstandingAmount: '1180.00' })],
      }),
      { companyId: COMPANY, partyId: 'party-1', ...period },
    )

    expect(partyStatementToCsv(statement).split('\r\n')).toEqual([
      'Date,Type,Number,Particulars,Debit,Credit,Balance',
      '2026-01-01,,,Opening balance,,,0.00 Dr',
      '2026-01-05,Sales invoice,INV-1,Sales invoice,1180.00,,1180.00 Dr',
      ',,,Total,1180.00,0.00,',
      '2026-03-31,,,Closing balance,,,1180.00 Dr',
    ])
  })
})
