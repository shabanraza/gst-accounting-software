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
        hsnCode: '5208',
        gstRate: '12',
        baseUnit: 'meter',
        saleRate: '120.00',
      },
      'Main',
    )

    expect(line).toMatchObject({
      itemId: 'item-1',
      itemName: 'Cotton Fabric',
      hsnCode: '5208',
      gstRate: '12',
      unit: 'meter',
      rate: '120.00',
    })
  })

  it('validates customer and line requirements', () => {
    const form = createInitialSalesInvoiceForm('Main', '27')
    form.customerId = customer.id

    expect(validateSalesInvoiceForm(form, undefined, '27')).toBe(
      'Select a customer.',
    )

    expect(validateSalesInvoiceForm(form, customer, '27')).toBe(
      'Add at least one line item with quantity and rate.',
    )
  })

  it('validates place of supply for inter-state supply', () => {
    const form = createInitialSalesInvoiceForm('Main', '27')
    form.customerId = customer.id
    form.region = 'central'
    form.placeOfSupply = ''
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          hsnCode: '5208',
          gstRate: '12',
          baseUnit: 'meter',
          saleRate: '100.00',
        },
        'Main',
      ),
    ]

    expect(validateSalesInvoiceForm(form, customer, '27')).toBeNull()
  })

  it('computes totals with sundry charges', () => {
    const form = createInitialSalesInvoiceForm('Main', '27')
    form.customerId = customer.id
    form.freight = '10.00'
    form.billDiscount = '5.00'
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          hsnCode: '5208',
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
        cgstAmount: '12.00',
        sgstAmount: '12.00',
        igstAmount: '0.00',
        totalGstAmount: '24.00',
        sundryTotal: '5.00',
        billDiscountAmount: '5.00',
        grandTotal: '229.00',
      },
    )
  })

  it('builds postInvoice payload with transport and charges', () => {
    const form = createInitialSalesInvoiceForm('Main', '27')
    form.customerId = customer.id
    form.dueDate = '2026-07-20'
    form.poReference = 'PO-100'
    form.transportMode = 'Road'
    form.freight = '50.00'
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          hsnCode: '5208',
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
      dueDate: '2026-07-20',
      poReference: 'PO-100',
      transportMode: 'Road',
      freight: '50.00',
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
    const form = createInitialSalesInvoiceForm('Main', '27')
    form.lines = [
      applyItemToLine(
        createEmptySalesLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          hsnCode: '5208',
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
