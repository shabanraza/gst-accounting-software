import { describe, expect, it } from 'vitest'

import {
  applyItemToPurchaseLine,
  buildPostPurchaseBillInput,
  computePurchaseFormTotals,
  createEmptyPurchaseLine,
  createInitialPurchaseBillForm,
  filterSupplierParties,
  validatePurchaseBillForm,
  validatePurchaseLedgerMappings,
  validateActiveFinancialYearId,
} from './purchase-bill-form.ts'

const supplier = {
  id: 'supplier-1',
  name: 'Fabric Mills',
  partyType: 'supplier' as const,
  stateCode: '27',
}

const company = {
  id: 'company-1',
  gstin: '27AAAAA0000A1Z5',
  stateCode: '27',
  financialYearStart: '2025-04-01',
  addressLine1: 'Shop 1',
  city: 'Mumbai',
  pincode: '400001',
}

const ledgerBySystemKey = {
  purchase: 'ledger-purchase',
  input_gst: 'ledger-gst',
  supplier_payable: 'ledger-ap',
  stock_in_hand: 'ledger-stock',
}

describe('purchase-bill-form', () => {
  it('filters supplier parties only', () => {
    expect(
      filterSupplierParties([
        supplier,
        {
          id: 'customer-1',
          name: 'Customer',
          partyType: 'customer',
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
    const line = applyItemToPurchaseLine(
      createEmptyPurchaseLine('Main'),
      {
        id: 'item-1',
        name: 'Cotton Fabric',
        gstRate: '12',
        baseUnit: 'meter',
        purchaseRate: '90.00',
      },
      'Main',
    )

    expect(line).toMatchObject({
      itemId: 'item-1',
      itemName: 'Cotton Fabric',
      gstRate: '12',
      unit: 'meter',
      rate: '90.00',
    })
  })

  it('validates supplier and line requirements', () => {
    const form = createInitialPurchaseBillForm('Main')
    form.supplierId = supplier.id

    expect(validatePurchaseBillForm(form, undefined, '27')).toBe(
      'Select a supplier.',
    )

    expect(validatePurchaseBillForm(form, supplier, '27')).toBe(
      'Add at least one line item with quantity and rate.',
    )
  })

  it('computes totals for filled lines', () => {
    const form = createInitialPurchaseBillForm('Main')
    form.supplierId = supplier.id
    form.lines = [
      applyItemToPurchaseLine(
        createEmptyPurchaseLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          gstRate: '12',
          baseUnit: 'meter',
          purchaseRate: '100.00',
        },
        'Main',
      ),
    ]
    form.lines[0]!.quantity = '2'

    expect(
      computePurchaseFormTotals(form, supplier.stateCode, company.stateCode),
    ).toEqual({
      lineCount: 1,
      taxableAmount: '200.00',
      totalGstAmount: '24.00',
      grandTotal: '224.00',
    })
  })

  it('builds postBill payload with ledger mappings', () => {
    const form = createInitialPurchaseBillForm('Main')
    form.supplierId = supplier.id
    form.lines = [
      applyItemToPurchaseLine(
        createEmptyPurchaseLine('Main'),
        {
          id: 'item-1',
          name: 'Cotton Fabric',
          gstRate: '12',
          baseUnit: 'meter',
          purchaseRate: '100.00',
        },
        'Main',
      ),
    ]

    const payload = buildPostPurchaseBillInput(form, {
      company,
      ledgerBySystemKey,
      supplier,
      supplierBillNumber: 'PUR-0001',
    })

    expect(payload).toMatchObject({
      companyId: 'company-1',
      supplierId: 'supplier-1',
      supplierBillNumber: 'PUR-0001',
      financialYearStart: '2025-04-01',
      purchaseAccountId: 'ledger-purchase',
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
    expect(validatePurchaseLedgerMappings(ledgerBySystemKey)).toBeNull()
    expect(
      validatePurchaseLedgerMappings({
        ...ledgerBySystemKey,
        stock_in_hand: undefined,
      }),
    ).toBe('Missing ledger mapping: stock_in_hand')
  })

  it('requires active financial year id', () => {
    expect(validateActiveFinancialYearId(null)).toBe(
      'Financial year is not configured.',
    )
    expect(validateActiveFinancialYearId('fy-1')).toBeNull()
  })
})
