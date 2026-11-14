import { beforeEach, describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { createParty } from '#/features/parties/party-service.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPaymentVoucherRepository } from '#/features/payments/payment-voucher-store.ts'
import {
  applyVoucherAdvance,
  cancelPaymentVoucher,
  PaymentVoucherError,
  paymentVoucherForBill,
  postPaymentVoucher,
  receiptVoucherForInvoice,
} from '#/features/payments/payment-voucher-service.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'

import type { LedgerAccountRecord } from '#/features/accounting/chart-of-accounts.ts'
import type { PaymentVoucherDependencies } from '#/features/payments/payment-voucher-service.ts'
import type { PurchaseBillRecord } from '#/features/purchases/purchase-bill-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'

let deps: PaymentVoucherDependencies
let companyId: string
let accounts: Array<LedgerAccountRecord>
let customerId: string
let supplierId: string

const accountOf = (key: string) =>
  accounts.find((account) => account.systemKey === key)!.id

function balances(accountId: string) {
  return deps.posting.listByCompanyId(companyId).then((entries) =>
    entries
      .flatMap((entry) => entry.lines)
      .filter((line) => line.ledgerAccountId === accountId)
      .reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0),
  )
}

async function addInvoice(number: string, total: string, date = '2026-05-01') {
  const invoice = {
    id: crypto.randomUUID(),
    companyId,
    customerId,
    invoiceNumber: number,
    invoiceDate: date,
    status: 'posted',
    paymentStatus: 'Pending',
    totalAmount: total,
    outstandingAmount: total,
    lines: [],
  } as unknown as SalesInvoiceRecord
  await deps.invoices.create(invoice)
  return invoice
}

async function addBill(number: string, total: string) {
  const bill = {
    id: crypto.randomUUID(),
    companyId,
    supplierId,
    supplierBillNumber: number,
    billDate: '2026-05-01',
    paymentStatus: 'Pending',
    totalAmount: total,
    outstandingAmount: total,
    lines: [],
  } as unknown as PurchaseBillRecord
  await deps.bills.create(bill)
  return bill
}

beforeEach(async () => {
  companyId = crypto.randomUUID()
  const ledgers = new InMemoryLedgerAccountRepository()
  accounts = await setupDefaultChartOfAccounts(ledgers, {
    companyId,
    businessType: 'wholesale',
  })
  const financialYears = new InMemoryFinancialYearRepository()
  await financialYears.create({
    id: crypto.randomUUID(),
    companyId,
    startDate: '2026-04-01',
    endDate: '2027-03-31',
    isActive: true,
    createdAt: new Date(),
  })
  const parties = new InMemoryPartyRepository()
  deps = {
    invoices: new InMemorySalesInvoiceRepository(),
    bills: new InMemoryPurchaseBillRepository(),
    posting: new InMemoryLedgerPostingRepository(),
    parties,
    sequences: new InMemoryDocumentSequenceRepository(),
    paymentVouchers: new InMemoryPaymentVoucherRepository(),
    ledgers,
    financialYears,
  }
  const base = {
    companyId,
    gstin: null,
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 30,
    receivableAccountId: accountOf('customer_receivable'),
    payableAccountId: accountOf('supplier_payable'),
  }
  customerId = (
    await createParty(parties, {
      ...base,
      name: 'Noor Retailers',
      partyType: 'customer',
    })
  ).id
  supplierId = (
    await createParty(parties, {
      ...base,
      name: 'Textile Mills',
      partyType: 'supplier',
    })
  ).id
})

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    companyId,
    kind: 'receipt' as const,
    partyId: customerId,
    voucherDate: '2026-06-10',
    mode: 'cash' as const,
    cashBankAccountId: accountOf('cash'),
    reference: '',
    amount: '1000.00',
    narration: '',
    allocations: [],
    ...overrides,
  }
}

describe('postPaymentVoucher', () => {
  test('splits a receipt across three invoices and updates their statuses', async () => {
    const a = await addInvoice('INV-1', '300.00')
    const b = await addInvoice('INV-2', '500.00')
    const c = await addInvoice('INV-3', '400.00')

    const voucher = await postPaymentVoucher(
      deps,
      receipt({
        amount: '1000.00',
        allocations: [
          { documentId: a.id, amount: '300.00' },
          { documentId: b.id, amount: '500.00' },
          { documentId: c.id, amount: '200.00' },
        ],
      }),
    )

    expect(voucher.voucherNumber).toBe('RCT-0001')
    expect(voucher.unallocatedAmount).toBe('0.00')
    expect(voucher.allocations).toHaveLength(3)
    expect(voucher.allocations[0]).toMatchObject({
      documentType: 'sales_invoice',
      documentNumber: 'INV-1',
      amount: '300.00',
    })

    const [ia, ib, ic] = await Promise.all(
      [a, b, c].map((doc) => deps.invoices.findById(doc.id)),
    )
    expect(ia).toMatchObject({
      outstandingAmount: '0.00',
      paymentStatus: 'Paid',
    })
    expect(ib).toMatchObject({
      outstandingAmount: '0.00',
      paymentStatus: 'Paid',
    })
    expect(ic).toMatchObject({
      outstandingAmount: '200.00',
      paymentStatus: 'Part paid',
    })

    expect(await balances(accountOf('cash'))).toBe(1000)
    expect(await balances(accountOf('customer_receivable'))).toBe(-1000)

    const stored = await deps.paymentVouchers.findById(companyId, voucher.id)
    expect(stored?.allocations).toHaveLength(3)
  })

  test('keeps the unallocated remainder as an advance on the receivable', async () => {
    const a = await addInvoice('INV-1', '300.00')

    const voucher = await postPaymentVoucher(
      deps,
      receipt({
        amount: '1000.00',
        allocations: [{ documentId: a.id, amount: '300.00' }],
      }),
    )

    expect(voucher.unallocatedAmount).toBe('700.00')
    expect(await balances(accountOf('customer_receivable'))).toBe(-1000)
  })

  test('accepts a pure advance with no allocations', async () => {
    const voucher = await postPaymentVoucher(deps, receipt())
    expect(voucher.unallocatedAmount).toBe('1000.00')
    expect(voucher.allocations).toEqual([])
  })

  test('bank mode debits the chosen bank ledger and keeps the reference', async () => {
    const voucher = await postPaymentVoucher(
      deps,
      receipt({
        mode: 'upi',
        cashBankAccountId: accountOf('bank'),
        reference: 'UTR123',
      }),
    )

    expect(voucher.reference).toBe('UTR123')
    expect(await balances(accountOf('bank'))).toBe(1000)
    expect(await balances(accountOf('cash'))).toBe(0)
  })

  test('a supplier payment credits cash and debits payable, numbered PAY', async () => {
    const bill = await addBill('SB-9', '800.00')

    const voucher = await postPaymentVoucher(
      deps,
      receipt({
        kind: 'payment',
        partyId: supplierId,
        amount: '500.00',
        allocations: [{ documentId: bill.id, amount: '500.00' }],
      }),
    )

    expect(voucher.voucherNumber).toBe('PAY-0001')
    expect(voucher.allocations[0]).toMatchObject({
      documentType: 'purchase_bill',
      documentNumber: 'SB-9',
    })
    expect(await deps.bills.findById(bill.id)).toMatchObject({
      outstandingAmount: '300.00',
      paymentStatus: 'Part paid',
    })
    expect(await balances(accountOf('cash'))).toBe(-500)
    expect(await balances(accountOf('supplier_payable'))).toBe(500)
  })

  test('numbers come from the document sequence', async () => {
    const first = await postPaymentVoucher(deps, receipt())
    const second = await postPaymentVoucher(deps, receipt())
    expect([first.voucherNumber, second.voucherNumber]).toEqual([
      'RCT-0001',
      'RCT-0002',
    ])
  })

  test('rejects allocations above the voucher amount', async () => {
    const a = await addInvoice('INV-1', '3000.00')
    await expect(
      postPaymentVoucher(
        deps,
        receipt({ allocations: [{ documentId: a.id, amount: '1500.00' }] }),
      ),
    ).rejects.toThrow(PaymentVoucherError)
    expect(await deps.posting.listByCompanyId(companyId)).toHaveLength(0)
  })

  test('rejects an allocation above the invoice outstanding', async () => {
    const a = await addInvoice('INV-1', '300.00')
    await expect(
      postPaymentVoucher(
        deps,
        receipt({ allocations: [{ documentId: a.id, amount: '400.00' }] }),
      ),
    ).rejects.toThrow('exceeds')
  })

  test("rejects another party's invoice", async () => {
    const a = await addInvoice('INV-1', '300.00')
    await deps.invoices.save({ ...a, customerId: crypto.randomUUID() })
    await expect(
      postPaymentVoucher(
        deps,
        receipt({ allocations: [{ documentId: a.id, amount: '100.00' }] }),
      ),
    ).rejects.toThrow(PaymentVoucherError)
  })

  test('rejects the same document twice', async () => {
    const a = await addInvoice('INV-1', '300.00')
    await expect(
      postPaymentVoucher(
        deps,
        receipt({
          allocations: [
            { documentId: a.id, amount: '100.00' },
            { documentId: a.id, amount: '100.00' },
          ],
        }),
      ),
    ).rejects.toThrow(PaymentVoucherError)
  })

  test('rejects a cash/bank ledger that is not a cash or bank asset', async () => {
    await expect(
      postPaymentVoucher(
        deps,
        receipt({ cashBankAccountId: accountOf('customer_receivable') }),
      ),
    ).rejects.toThrow(PaymentVoucherError)
  })

  test('rejects a party from another company', async () => {
    await expect(
      postPaymentVoucher(deps, receipt({ partyId: crypto.randomUUID() })),
    ).rejects.toThrow(PaymentVoucherError)
  })

  test('rejects a non-positive amount', async () => {
    await expect(
      postPaymentVoucher(deps, receipt({ amount: '0' })),
    ).rejects.toThrow(PaymentVoucherError)
  })
})

describe('applyVoucherAdvance', () => {
  test('applies an advance to a later invoice without a new ledger entry', async () => {
    const voucher = await postPaymentVoucher(deps, receipt())
    const later = await addInvoice('INV-7', '600.00', '2026-07-01')

    const updated = await applyVoucherAdvance(deps, {
      companyId,
      voucherId: voucher.id,
      allocations: [{ documentId: later.id, amount: '600.00' }],
    })

    expect(updated.unallocatedAmount).toBe('400.00')
    expect(updated.allocations).toHaveLength(1)
    expect(await deps.invoices.findById(later.id)).toMatchObject({
      outstandingAmount: '0.00',
      paymentStatus: 'Paid',
    })
    expect(await deps.posting.listByCompanyId(companyId)).toHaveLength(1)
  })

  test('rejects applying more than the advance left', async () => {
    const voucher = await postPaymentVoucher(
      deps,
      receipt({ amount: '100.00' }),
    )
    const later = await addInvoice('INV-7', '600.00')
    await expect(
      applyVoucherAdvance(deps, {
        companyId,
        voucherId: voucher.id,
        allocations: [{ documentId: later.id, amount: '200.00' }],
      }),
    ).rejects.toThrow(PaymentVoucherError)
  })
})

describe('single-bill wrappers for older clients', () => {
  test('a single-invoice receipt is stored as a numbered cash voucher', async () => {
    const a = await addInvoice('INV-1', '300.00')

    const record = await receiptVoucherForInvoice(deps, {
      companyId,
      invoiceId: a.id,
      amount: '100.00',
      receiptDate: '2026-06-01',
      cashAccountId: accountOf('cash'),
      receivableAccountId: accountOf('customer_receivable'),
    })

    expect(record).toMatchObject({
      documentType: 'sales_invoice',
      documentId: a.id,
      allocatedAmount: '100.00',
    })
    const [voucher] = await deps.paymentVouchers.listByCompanyId(companyId)
    expect(voucher).toMatchObject({
      voucherNumber: 'RCT-0001',
      mode: 'cash',
      partyId: customerId,
      unallocatedAmount: '0.00',
    })
  })

  test('a single-bill payment is stored as a numbered cash voucher', async () => {
    const bill = await addBill('SB-1', '300.00')

    await paymentVoucherForBill(deps, {
      companyId,
      purchaseBillId: bill.id,
      amount: '300.00',
      paymentDate: '2026-06-01',
      cashAccountId: accountOf('cash'),
      payableAccountId: accountOf('supplier_payable'),
    })

    const [voucher] = await deps.paymentVouchers.listByCompanyId(companyId)
    expect(voucher.voucherNumber).toBe('PAY-0001')
    expect(await deps.bills.findById(bill.id)).toMatchObject({
      paymentStatus: 'Paid',
    })
  })

  test('an unknown invoice is rejected', async () => {
    await expect(
      receiptVoucherForInvoice(deps, {
        companyId,
        invoiceId: crypto.randomUUID(),
        amount: '100.00',
        receiptDate: '2026-06-01',
        cashAccountId: accountOf('cash'),
        receivableAccountId: accountOf('customer_receivable'),
      }),
    ).rejects.toThrow(PaymentVoucherError)
  })
})

describe('cancelPaymentVoucher', () => {
  test('restores outstanding and reverses the ledger entry', async () => {
    const a = await addInvoice('INV-1', '300.00')
    const voucher = await postPaymentVoucher(
      deps,
      receipt({ allocations: [{ documentId: a.id, amount: '300.00' }] }),
    )

    const cancelled = await cancelPaymentVoucher(deps, {
      companyId,
      voucherId: voucher.id,
    })

    expect(cancelled.status).toBe('cancelled')
    expect(await deps.invoices.findById(a.id)).toMatchObject({
      outstandingAmount: '300.00',
      paymentStatus: 'Pending',
    })
    expect(await balances(accountOf('cash'))).toBe(0)
    expect(await balances(accountOf('customer_receivable'))).toBe(0)

    await expect(
      cancelPaymentVoucher(deps, { companyId, voucherId: voucher.id }),
    ).rejects.toThrow(PaymentVoucherError)
  })
})
