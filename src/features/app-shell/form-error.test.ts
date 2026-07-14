import { describe, expect, it } from 'vitest'

import { getFormErrorMessage } from '#/features/app-shell/form-error.ts'

describe('getFormErrorMessage', () => {
  it('maps e-way bill duplicate errors to a friendly message', () => {
    const message = getFormErrorMessage(
      new Error(
        'An e-way bill already exists for sales invoice: 35d6d309-db70-44f9-854c-dd47c68d1e17',
      ),
      'Failed to generate e-way bill',
    )

    expect(message).toBe(
      'An e-way bill is already generated for this invoice.',
    )
  })

  it('maps e-invoice duplicate errors to a friendly message', () => {
    const message = getFormErrorMessage(
      new Error(
        'An e-invoice already exists for sales invoice: 35d6d309-db70-44f9-854c-dd47c68d1e17',
      ),
      'Failed to generate IRN',
    )

    expect(message).toBe(
      'An e-invoice is already generated for this invoice.',
    )
  })

  it('keeps readable business validation messages', () => {
    const message = getFormErrorMessage(
      new Error(
        'Credit limit exceeded for City Brokers: limit 1000.00, projected outstanding 1500.00',
      ),
      'Save failed',
    )

    expect(message).toContain('Credit limit exceeded for City Brokers')
  })

  it('falls back when the error looks internal', () => {
    const message = getFormErrorMessage(
      new Error('InvoiceNotFoundError: missing record'),
      'Save failed',
    )

    expect(message).toBe('Save failed')
  })
})
