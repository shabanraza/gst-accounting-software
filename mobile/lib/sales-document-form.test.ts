import { describe, expect, it } from 'vitest'

import {
  applyItemToSalesDocumentLine,
  buildCreateSalesDocumentInput,
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

  it('applies item defaults to line', () => {
    expect(
      applyItemToSalesDocumentLine(
        { itemId: '', itemName: '', unit: '', quantity: '2', rate: '' },
        {
          id: 'item-1',
          name: 'Fabric',
          baseUnit: 'Meter',
          saleRate: '120.00',
        },
      ),
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
    expect(validateSalesDocumentForm(form)).toBe('Select an item.')

    form.line.itemId = 'item-1'
    form.line.itemName = 'Fabric'
    form.line.unit = 'Meter'
    form.line.rate = '100'
    expect(validateSalesDocumentForm(form)).toBeNull()
  })

  it('builds create payload', () => {
    const form = createInitialSalesDocumentForm()
    form.customerId = 'cust-1'
    form.documentNumber = 'QT-1'
    form.line = {
      itemId: 'item-1',
      itemName: 'Fabric',
      unit: 'Meter',
      quantity: '2',
      rate: '100.00',
    }

    expect(buildCreateSalesDocumentInput(form, 'company-1')).toMatchObject({
      companyId: 'company-1',
      documentType: 'quotation',
      documentNumber: 'QT-1',
      customerId: 'cust-1',
      lines: [
        {
          itemId: 'item-1',
          quantity: '2',
          rate: '100.00',
        },
      ],
    })
  })
})
