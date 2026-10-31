import { describe, expect, test } from 'vitest'

import { computeInvoice } from '#/features/tools/invoice-generator-service.ts'

describe('computeInvoice', () => {
  test('splits intra-state tax into CGST and SGST and rounds the total', () => {
    const invoice = computeInvoice({
      sellerStateCode: '27',
      placeOfSupplyCode: '27',
      lines: [
        { description: 'Cotton shirt', hsn: '6205', quantity: '3', rate: '499.50', gstRate: '5' },
        { description: 'Stitching', hsn: '998821', quantity: '1', rate: '200', gstRate: '18' },
      ],
    })

    expect(invoice.interState).toBe(false)
    expect(invoice.lines[0]).toMatchObject({
      taxableValue: '1498.50',
      gstAmount: '74.93',
      cgstAmount: '37.47',
      sgstAmount: '37.46',
    })
    expect(invoice.taxableTotal).toBe('1698.50')
    expect(invoice.cgstTotal).toBe('55.47')
    expect(invoice.sgstTotal).toBe('55.46')
    expect(invoice.igstTotal).toBe('0.00')
    expect(invoice.roundOff).toBe('-0.43')
    expect(invoice.grandTotal).toBe('1809.00')
    expect(invoice.amountInWords).toBe('One Thousand Eight Hundred Nine Rupees Only')
  })

  test('uses IGST when the place of supply is another state', () => {
    const invoice = computeInvoice({
      sellerStateCode: '27',
      placeOfSupplyCode: '29',
      lines: [{ description: 'Laptop bag', hsn: '4202', quantity: '2', rate: '1000', gstRate: '18' }],
    })
    expect(invoice.interState).toBe(true)
    expect(invoice.igstTotal).toBe('360.00')
    expect(invoice.grandTotal).toBe('2360.00')
  })

  test('treats blank or invalid numbers as zero', () => {
    const invoice = computeInvoice({
      sellerStateCode: '27',
      placeOfSupplyCode: '27',
      lines: [{ description: '', hsn: '', quantity: '', rate: 'x', gstRate: '18' }],
    })
    expect(invoice.grandTotal).toBe('0.00')
  })
})
