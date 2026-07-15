import { describe, expect, it } from 'vitest'

import {
  buildCustomerReceiptInput,
  buildSupplierPaymentInput,
  filterOpenPurchaseDocuments,
  filterOpenSalesDocuments,
  validatePaymentAllocation,
  validateReceiptLedgers,
  validateSupplierPaymentLedgers,
} from './payment-form.ts'

describe('payment-form', () => {
  it('filters open sales and purchase documents', () => {
    expect(
      filterOpenSalesDocuments([
        {
          id: '1',
          invoiceNumber: 'INV-1',
          customerId: 'c1',
          totalAmount: '100.00',
          outstandingAmount: '50.00',
          paymentStatus: 'Part paid',
        },
        {
          id: '2',
          invoiceNumber: 'INV-2',
          customerId: 'c2',
          totalAmount: '100.00',
          outstandingAmount: '0.00',
          paymentStatus: 'Paid',
        },
        {
          id: '3',
          invoiceNumber: 'INV-3',
          customerId: 'c3',
          totalAmount: '100.00',
          outstandingAmount: '50.00',
          paymentStatus: 'Part paid',
          status: 'cancelled',
        },
      ]),
    ).toHaveLength(1)

    expect(
      filterOpenPurchaseDocuments([
        {
          id: 'b1',
          supplierBillNumber: 'PB-1',
          supplierId: 's1',
          totalAmount: '200.00',
          outstandingAmount: '20.00',
          paymentStatus: 'Part paid',
        },
      ]),
    ).toHaveLength(1)
  })

  it('validates allocation draft', () => {
    expect(
      validatePaymentAllocation(
        { documentId: '', amount: '10', paymentDate: '2026-07-15' },
        '100.00',
      ),
    ).toBe('Select a document.')

    expect(
      validatePaymentAllocation(
        { documentId: 'doc-1', amount: '150', paymentDate: '2026-07-15' },
        '100.00',
      ),
    ).toBe('Amount cannot exceed outstanding balance.')
  })

  it('requires ledger mappings', () => {
    expect(validateReceiptLedgers({})).toContain('receivable')
    expect(validateSupplierPaymentLedgers({})).toContain('payable')
  })

  it('builds payment mutation payloads', () => {
    const draft = {
      documentId: 'doc-1',
      amount: '50.00',
      paymentDate: '2026-07-15',
    }
    const ledgerBySystemKey = {
      cash: 'cash-1',
      customer_receivable: 'recv-1',
      supplier_payable: 'pay-1',
    }

    expect(
      buildCustomerReceiptInput({
        companyId: 'company-1',
        draft,
        ledgerBySystemKey,
      }),
    ).toMatchObject({
      companyId: 'company-1',
      invoiceId: 'doc-1',
      amount: '50.00',
      cashAccountId: 'cash-1',
      receivableAccountId: 'recv-1',
    })

    expect(
      buildSupplierPaymentInput({
        companyId: 'company-1',
        draft,
        ledgerBySystemKey,
      }),
    ).toMatchObject({
      purchaseBillId: 'doc-1',
      payableAccountId: 'pay-1',
    })
  })
})
