import { describe, expect, it } from 'vitest'

import {
  SALES_DOCUMENT_SERIES,
  applyItemToSalesDocumentLine,
  buildCreateSalesDocumentInput,
  computeSalesDocumentFormTotal,
  createEmptySalesDocumentLine,
  createInitialSalesDocumentForm,
  filterCustomerParties,
  validateSalesDocumentForm,
} from './sales-document-form.ts'

describe('sales-document-form', () => {
  it('filters customer parties', () => {
    expect(
      filterCustomerParties([
        { id: '1', name: 'Retail', partyType: 'customer' },
        { id: '2', name: 'Vendor', partyType: 'supplier' },
        { id: '3', name: 'Both', partyType: 'both' },
      ]),
    ).toHaveLength(2)
  })

  it('maps document types to voucher series', () => {
    expect(SALES_DOCUMENT_SERIES.quotation).toBe('QT')
    expect(SALES_DOCUMENT_SERIES.sales_order).toBe('SO')
    expect(SALES_DOCUMENT_SERIES.delivery_challan).toBe('DC')
  })

  it('applies item defaults to line', () => {
    expect(
      applyItemToSalesDocumentLine(createEmptySalesDocumentLine(), {
        id: 'item-1',
        name: 'Fabric',
        baseUnit: 'Meter',
        saleRate: '120.00',
      }),
    ).toMatchObject({
      itemId: 'item-1',
      unit: 'Meter',
      rate: '120.00',
    })
  })

  it('validates required fields', () => {
    const form = createInitialSalesDocumentForm()
    expect(validateSalesDocumentForm(form)).toBe('Select a customer.')

    form.customerId = 'cust-1'
    expect(validateSalesDocumentForm(form)).toBe('Add at least one item.')

    form.lines[0] = {
      ...form.lines[0],
      itemId: 'item-1',
      itemName: 'Fabric',
      unit: 'Meter',
      rate: '100',
    }
    expect(validateSalesDocumentForm(form)).toBeNull()
  })

  it('computes estimated total across lines', () => {
    const form = createInitialSalesDocumentForm()
    form.lines = [
      {
        ...createEmptySalesDocumentLine(),
        itemId: 'item-1',
        quantity: '2',
        rate: '100',
      },
      {
        ...createEmptySalesDocumentLine(),
        itemId: 'item-2',
        quantity: '1',
        rate: '50',
      },
    ]

    expect(computeSalesDocumentFormTotal(form)).toBe('250.00')
  })

  it('builds create payload with multiple lines', () => {
    const form = createInitialSalesDocumentForm()
    form.customerId = 'cust-1'
    form.documentNumber = 'QT-1'
    form.lines = [
      {
        ...createEmptySalesDocumentLine(),
        itemId: 'item-1',
        itemName: 'Fabric',
        unit: 'Meter',
        quantity: '2',
        rate: '100.00',
      },
      {
        ...createEmptySalesDocumentLine(),
        itemId: 'item-2',
        itemName: 'Thread',
        unit: 'Box',
        quantity: '1',
        rate: '25.00',
      },
    ]

    expect(
      buildCreateSalesDocumentInput(form, 'company-1', 'QT-0001'),
    ).toMatchObject({
      companyId: 'company-1',
      documentType: 'quotation',
      documentNumber: 'QT-0001',
      customerId: 'cust-1',
      lines: [
        { itemId: 'item-1', quantity: '2' },
        { itemId: 'item-2', quantity: '1' },
      ],
    })
  })
})
