import { hasOutstandingBalance, validatePaymentAmount } from './payment-allocation.ts'

export type PaymentTab = 'receipts' | 'payments'

export type OpenSalesDocument = {
  id: string
  invoiceNumber: string
  customerId: string
  totalAmount: string
  outstandingAmount: string
  paymentStatus: string
  status?: string
}

export type OpenPurchaseDocument = {
  id: string
  supplierBillNumber: string
  supplierId: string
  totalAmount: string
  outstandingAmount: string
  paymentStatus: string
  status?: string
}

export type PaymentAllocationDraft = {
  documentId: string
  amount: string
  paymentDate: string
}

export function filterOpenSalesDocuments(documents: Array<OpenSalesDocument>) {
  return documents.filter(
    (document) =>
      document.status !== 'cancelled' &&
      document.paymentStatus !== 'Paid' &&
      hasOutstandingBalance(document.outstandingAmount),
  )
}

export function filterOpenPurchaseDocuments(
  documents: Array<OpenPurchaseDocument>,
) {
  return documents.filter(
    (document) =>
      document.status !== 'cancelled' &&
      document.paymentStatus !== 'Paid' &&
      hasOutstandingBalance(document.outstandingAmount),
  )
}

export function validatePaymentAllocation(
  draft: PaymentAllocationDraft,
  outstandingAmount: string,
) {
  if (!draft.documentId.trim()) {
    return 'Select a document.'
  }

  if (!draft.paymentDate.trim()) {
    return 'Payment date is required.'
  }

  return validatePaymentAmount(draft.amount, outstandingAmount)
}

export function validateReceiptLedgers(
  ledgerBySystemKey: Partial<Record<string, string>>,
) {
  if (!ledgerBySystemKey.cash || !ledgerBySystemKey.customer_receivable) {
    return 'Cash or receivable ledger mapping is missing.'
  }

  return null
}

export function validateSupplierPaymentLedgers(
  ledgerBySystemKey: Partial<Record<string, string>>,
) {
  if (!ledgerBySystemKey.cash || !ledgerBySystemKey.supplier_payable) {
    return 'Cash or payable ledger mapping is missing.'
  }

  return null
}

export function buildCustomerReceiptInput(input: {
  companyId: string
  draft: PaymentAllocationDraft
  ledgerBySystemKey: Partial<Record<string, string>>
}) {
  const cashAccountId = input.ledgerBySystemKey.cash!
  const receivableAccountId = input.ledgerBySystemKey.customer_receivable!

  return {
    companyId: input.companyId,
    invoiceId: input.draft.documentId,
    amount: input.draft.amount,
    receiptDate: input.draft.paymentDate,
    cashAccountId,
    receivableAccountId,
  }
}

export function buildSupplierPaymentInput(input: {
  companyId: string
  draft: PaymentAllocationDraft
  ledgerBySystemKey: Partial<Record<string, string>>
}) {
  const cashAccountId = input.ledgerBySystemKey.cash!
  const payableAccountId = input.ledgerBySystemKey.supplier_payable!

  return {
    companyId: input.companyId,
    purchaseBillId: input.draft.documentId,
    amount: input.draft.amount,
    paymentDate: input.draft.paymentDate,
    cashAccountId,
    payableAccountId,
  }
}
