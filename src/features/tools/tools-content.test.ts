import { describe, expect, test } from 'vitest'

import { TOOLS } from '#/features/tools/tools-content.ts'

describe('HSN finder search snippet', () => {
  const tool = TOOLS['hsn-code-finder']
  const headline = tool.seoTitle.split(' | ')[0]

  test('fits in a search result without being cut off', () => {
    expect(headline.length).toBeLessThanOrEqual(60)
    expect(tool.seoDescription.length).toBeLessThanOrEqual(155)
  })

  test('leads with what people type and says it is free', () => {
    expect(headline.startsWith('HSN Code Search by Product Name')).toBe(true)
    expect(headline).toContain('Free')
    expect(headline).toContain('SAC')
    expect(tool.seoDescription).toContain('no signup')
  })

  test('promises only what the finder returns, a chapter or SAC heading', () => {
    expect(tool.seoDescription).toContain('HSN chapter')
    expect(tool.seoDescription).toContain('SAC heading')
    expect(tool.seoDescription).toContain('4 or 6')
  })
})
