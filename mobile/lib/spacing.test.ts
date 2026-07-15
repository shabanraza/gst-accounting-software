import { describe, expect, it } from 'vitest'

import { pageLayout, spacing } from './spacing'

describe('spacing', () => {
  it('uses 8pt grid with 16px page gutter', () => {
    expect(spacing.lg).toBe(16)
    expect(pageLayout.pageX).toBe(16)
  })

  it('uses 24px between major sections', () => {
    expect(pageLayout.sectionGap).toBe(24)
  })

  it('uses 12px between section title and content', () => {
    expect(pageLayout.sectionHeaderGap).toBe(12)
  })
})
