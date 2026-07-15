import { describe, expect, it } from 'vitest'

import { layout, spacing } from './spacing'

describe('spacing', () => {
  it('uses 8pt grid with 16px page gutter', () => {
    expect(spacing.lg).toBe(16)
    expect(layout.pageX).toBe(16)
  })

  it('uses 24px between major sections', () => {
    expect(layout.sectionGap).toBe(24)
  })

  it('uses 12px between section title and content', () => {
    expect(layout.sectionHeaderGap).toBe(12)
  })
})
