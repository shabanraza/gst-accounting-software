import Decimal from 'decimal.js'

import { postLedgerEntry } from '#/features/accounting/posting-engine.ts'

import type { LedgerPostingRepository } from '#/features/accounting/posting-engine.ts'
import type {
  PaymentStatus,
  SalesInvoiceRecord,
  SalesInvoiceRepository,
} from '#/features/sales/sales-invoice-service.ts'
import type {
  PurchaseBillRecord,
  PurchaseBillRepository,
} from '#/features/purchases/purchase-bill-service.ts'

export type PaymentAllocationRecord = {
  id: string
  companyId: string
  documentType: 'sales_invoice' | 'purchase_bill'
  documentId: string
  allocatedAmount: string
  paymentDate: string
  ledgerEntryId: string
  createdAt: Date
}

export type CustomerReceiptInput = {
  companyId: string
  invoiceId: string
  amount: string
  receiptDate: string
  cashAccountId: string
  receivableAccountId: string
}

export type SupplierPaymentInput = {
  companyId: string
  purchaseBillId: string
  amount: string
  paymentDate: string
  cashAccountId: string
  payableAccountId: string
}

export type PaymentDependencies = {
  invoices: SalesInvoiceRepository
  posting: LedgerPostingRepository
}

export type SupplierPaymentDependencies = {
  bills: PurchaseBillRepository
  posting: LedgerPostingRepository
}

export class PaymentAllocationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'PaymentAllocationError'
  }
}

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

function money(value: string) {
  return new Decimal(value)
}

function formatMoney(value: Decimal) {
  return value.toFixed(2)
}

function statusForOutstanding(
  outstanding: Decimal,
  total: Decimal,
): PaymentStatus {
  if (outstanding.lte(0)) {
    return 'Paid'
  }

  if (outstanding.lt(total)) {
    return 'Part paid'
  }

  return 'Pending'
}

export async function allocateCustomerReceipt(
  deps: PaymentDependencies,
  input: CustomerReceiptInput,
): Promise<PaymentAllocationRecord> {
  const invoice = await deps.invoices.findById(input.invoiceId)

  if (!invoice || invoice.companyId !== input.companyId) {
    throw new PaymentAllocationError('Sales invoice not found for company')
  }

  if (invoice.status === 'cancelled') {
    throw new PaymentAllocationError(
      'Cannot record a receipt against a cancelled invoice',
    )
  }

  const amount = money(input.amount)
  const outstanding = money(invoice.outstandingAmount)

  if (amount.lte(0)) {
    throw new PaymentAllocationError('Receipt amount must be greater than zero')
  }

  if (amount.gt(outstanding)) {
    throw new PaymentAllocationError(
      'Receipt amount exceeds invoice outstanding',
    )
  }

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.receiptDate,
    narration: `Receipt against ${invoice.invoiceNumber}`,
    voucherType: 'receipt',
    lines: [
      {
        ledgerAccountId: input.cashAccountId,
        debit: formatMoney(amount),
        credit: '0.00',
      },
      {
        ledgerAccountId: input.receivableAccountId,
        debit: '0.00',
        credit: formatMoney(amount),
      },
    ],
  })

  const nextOutstanding = outstanding.minus(amount)
  const updated: SalesInvoiceRecord = {
    ...invoice,
    outstandingAmount: formatMoney(nextOutstanding),
    paymentStatus: statusForOutstanding(
      nextOutstanding,
      money(invoice.totalAmount),
    ),
  }

  await deps.invoices.save(updated)

  return {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    documentType: 'sales_invoice',
    documentId: invoice.id,
    allocatedAmount: formatMoney(amount),
    paymentDate: input.receiptDate,
    ledgerEntryId: ledgerEntry.id,
    createdAt: new Date(),
  }
}

export async function allocateSupplierPayment(
  deps: SupplierPaymentDependencies,
  input: SupplierPaymentInput,
): Promise<PaymentAllocationRecord> {
  const bill = await deps.bills.findById(input.purchaseBillId)

  if (!bill || bill.companyId !== input.companyId) {
    throw new PaymentAllocationError('Purchase bill not found for company')
  }

  const amount = money(input.amount)
  const outstanding = money(bill.outstandingAmount)

  if (amount.lte(0)) {
    throw new PaymentAllocationError('Payment amount must be greater than zero')
  }

  if (amount.gt(outstanding)) {
    throw new PaymentAllocationError('Payment amount exceeds bill outstanding')
  }

  const ledgerEntry = await postLedgerEntry(deps.posting, {
    companyId: input.companyId,
    entryDate: input.paymentDate,
    narration: `Payment against ${bill.supplierBillNumber}`,
    voucherType: 'payment',
    lines: [
      {
        ledgerAccountId: input.payableAccountId,
        debit: formatMoney(amount),
        credit: '0.00',
      },
      {
        ledgerAccountId: input.cashAccountId,
        debit: '0.00',
        credit: formatMoney(amount),
      },
    ],
  })

  const nextOutstanding = outstanding.minus(amount)
  const updated: PurchaseBillRecord = {
    ...bill,
    outstandingAmount: formatMoney(nextOutstanding),
    paymentStatus: statusForOutstanding(
      nextOutstanding,
      money(bill.totalAmount),
    ),
  }

  await deps.bills.save(updated)

  return {
    id: crypto.randomUUID(),
    companyId: input.companyId,
    documentType: 'purchase_bill',
    documentId: bill.id,
    allocatedAmount: formatMoney(amount),
    paymentDate: input.paymentDate,
    ledgerEntryId: ledgerEntry.id,
    createdAt: new Date(),
  }
}
