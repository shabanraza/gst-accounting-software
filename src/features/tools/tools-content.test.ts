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

  test('promises what the finder returns: codes and descriptions, not rates', () => {
    expect(tool.seoDescription).toContain('8-digit HSN')
    expect(tool.seoDescription).toContain('SAC codes')
    expect(tool.seoDescription).toContain('descriptions')
    expect(tool.seoDescription).not.toMatch(/\brates? (included|shown)\b/i)
  })

  test('credits the GST portal master it searches', () => {
    const text = tool.sections.flatMap((section) => section.paragraphs).join(' ')
    expect(text).toContain('Source: GST portal HSN/SAC master, 26 November 2026')
  })
})
