import { describe, expect, it } from 'vitest'

import {
  applyItemToLine,
  buildPostSalesInvoiceInput,
  computeFormTotals,
  createEmptySalesLine,
  createInitialSalesInvoiceForm,
  filterCustomerParties,
  formRequiresInventoryLedgers,
  validateLedgerMappings,
  validateSalesInvoiceForm,
} from './sales-invoice-form.ts'

const customer = {
  id: 'customer-1',
  name: 'Acme Traders',
  partyType: 'customer' as const,
  stateCode: '27',
}

const company = {
  id: 'company-1',
  gstin: '27AAAAA0000A1Z5',
  stateCode: '27',
  addressLine1: 'Shop 1',
  city: 'Mumbai',
  pincode: '400001',
}

const ledgerBySystemKey = {
  sales: 'ledger-sales',
  output_gst: 'ledger-gst',
  customer_receivable: 'ledger-ar',
  cash: 'ledger-cash',
  cogs: 'ledger-cogs',
  stock_in_hand: 'ledger-stock',
}

describe('sales-invoice-form', () => {
  it('filters customer parties only', () => {
    expect(
      filterCustomerParties([
        customer,
        {
          id: 'supplier-1',
          name: 'Supplier',
          partyType: 'supplier',
          stateCode: '24',
        },
        {
          id: 'both-1',
          name: 'Both',
          partyType: 'both',
          stateCode: '27',
        },
      ]),
    ).toHaveLength(2)
  })

  it('applies item defaults to a line', () => {
    const line = applyItemToLine(
      createEmptySalesLine('Main'),
      {
        id: 'item-1',
        name: 'Cotton Fabric',
        gstRate: '12',
        baseUnit: 'meter',
        saleRate: '120.00',
      },
      'Main',
    )

    expect(line).toMatchObject({
      itemId: 'item-1',
      itemName: 'Cotton Fabric',
      gstRate: '12',
      unit: 'meter',
      rate: '120.00',
    })
  })

  it('validates customer and line requirements', () => {
    const form = createInitialSalesInvoiceForm('Main')
    form.customerId = customer.id

    expect(validateSalesInvoiceForm(form, undefined, '27')).toBe(
      'Select a customer.',
    )

    expect(validateSalesInvoiceForm(form, customer, '27')).toBe(
      'Add at least one line item with quantity and rate.',
    )
  })

  it('computes totals for filled lines', () => {
    const form = createInitialSalesInvoiceForm('Main')
    form.customerId = customer.id
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          gstRate: '12',
          baseUnit: 'meter',
          saleRate: '100.00',
        },
        'Main',
      ),
    ]
    form.lines[0]!.quantity = '2'

    expect(computeFormTotals(form, customer.stateCode, company.stateCode)).toEqual(
      {
        lineCount: 1,
        taxableAmount: '200.00',
        totalGstAmount: '24.00',
        grandTotal: '224.00',
      },
    )
  })

  it('builds postInvoice payload with ledger mappings', () => {
    const form = createInitialSalesInvoiceForm('Main')
    form.customerId = customer.id
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          gstRate: '12',
          baseUnit: 'meter',
          saleRate: '100.00',
        },
        'Main',
      ),
    ]

    const payload = buildPostSalesInvoiceInput(form, {
      company,
      ledgerBySystemKey,
      customer,
      invoiceNumber: 'INV-0001',
      activeFinancialYearId: 'fy-1',
    })

    expect(payload).toMatchObject({
      companyId: 'company-1',
      customerId: 'customer-1',
      invoiceNumber: 'INV-0001',
      salesAccountId: 'ledger-sales',
      lines: [
        {
          itemId: 'item-1',
          description: 'Cotton Fabric',
          quantity: '1',
          rate: '100.00',
        },
      ],
    })
  })

  it('requires core ledger mappings', () => {
    expect(validateLedgerMappings(ledgerBySystemKey)).toBeNull()
    expect(
      validateLedgerMappings({ ...ledgerBySystemKey, cash: undefined }),
    ).toContain('Cash account')
  })

  it('requires inventory ledgers for tracked items', () => {
    const form = createInitialSalesInvoiceForm('Main')
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          gstRate: '12',
          baseUnit: 'meter',
          saleRate: '100.00',
        },
        'Main',
      ),
    ]

    expect(
      formRequiresInventoryLedgers(form, [
        { id: 'item-1', tracksInventory: true },
      ]),
    ).toBe(true)

    expect(
      validateLedgerMappings(
        {
          sales: 'ledger-sales',
          output_gst: 'ledger-gst',
          customer_receivable: 'ledger-ar',
          cash: 'ledger-cash',
        },
        { requiresInventoryLedgers: true },
      ),
    ).toContain('Cost of goods sold account')
  })
})
