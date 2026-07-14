import { describe, expect, test } from 'vitest'

import { parseGstr2bPortalJson } from '#/features/gst/gstr2b-portal-parser.ts'

describe('parseGstr2bPortalJson', () => {
  test('parses a flat array of portal rows', () => {
    const rows = parseGstr2bPortalJson(
      JSON.stringify([
        {
          supplierGstin: '24aabcu9603r1zm',
          supplierInvoiceNumber: ' sb-1 ',
          invoiceDate: '06-01-2026',
          taxableAmount: '500.00',
          totalGstAmount: '90.00',
        },
      ]),
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      supplierGstin: '24AABCU9603R1ZM',
      supplierInvoiceNumber: 'SB-1',
      invoiceDate: '2026-01-06',
      taxableAmount: '500.00',
      totalGstAmount: '90.00',
    })
  })

  test('parses official b2b export shape', () => {
    const rows = parseGstr2bPortalJson(
      JSON.stringify({
        data: {
          docdata: {
            b2b: [
              {
                ctin: '24AABCU9603R1ZM',
                inv: [
                  {
                    inum: 'INV-9',
                    idt: '15-01-2026',
                    txval: 1000,
                    camt: 90,
                    samt: 90,
                    iamt: 0,
                  },
                ],
              },
            ],
          },
        },
      }),
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      supplierGstin: '24AABCU9603R1ZM',
      supplierInvoiceNumber: 'INV-9',
      invoiceDate: '2026-01-15',
      taxableAmount: '1000.00',
      cgstAmount: '90.00',
      sgstAmount: '90.00',
      igstAmount: '0.00',
      totalGstAmount: '180.00',
    })
  })
})
