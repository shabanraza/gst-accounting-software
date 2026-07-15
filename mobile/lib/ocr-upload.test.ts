import { describe, expect, it } from 'vitest'

import { buildPlaceholderOcrFields } from './ocr-fields.ts'

describe('buildPlaceholderOcrFields', () => {
  it('creates low-confidence OCR fields for manual review', () => {
    const fields = buildPlaceholderOcrFields()
    expect(fields.supplierName.confidence).toBeLessThan(0.8)
    expect(fields.totalAmount.value).toBe('0')
  })
})
