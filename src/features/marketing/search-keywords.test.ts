import { describe, expect, test } from 'vitest'

import { GUIDES } from '#/features/marketing/content-pages.ts'
import { HELP_GUIDES } from '#/features/marketing/help-content.ts'
import { HERO, SITE } from '#/features/marketing/landing-content.ts'
import { TOOLS } from '#/features/tools/tools-content.ts'

/** Each page keeps the wording its title and description promise. */
const words = (text: string) => text.toLowerCase()

describe('search keywords', () => {
  test('the home page targets free GST billing software', () => {
    for (const text of [SITE.title, SITE.description, HERO.headline]) {
      expect(words(text)).toContain('free gst billing')
    }
    expect(words(SITE.title)).toContain('khata')
    expect(words(SITE.title)).toContain('inventory')
  })

  test('the invoice generator also answers "bill maker" searches', () => {
    const tool = TOOLS['gst-invoice-generator']
    expect(words(tool.seoTitle)).toContain('free gst invoice generator')
    expect(words(tool.seoTitle)).toContain('bill maker')
    expect(
      tool.sections.some((section) =>
        words(section.heading).includes('online bill generator'),
      ),
    ).toBe(true)
  })

  test('the calculator answers reverse GST searches', () => {
    expect(words(TOOLS['gst-calculator'].seoTitle)).toContain(
      'reverse gst calculator',
    )
  })

  test('the validator targets "GST number check" and says its limits', () => {
    const tool = TOOLS['gstin-validator']
    expect(words(tool.seoTitle)).toMatch(/^gst number check/)
    expect(words(tool.intro)).toContain(
      'does not look up the business name or registration status',
    )
    expect(tool.seoDescription.length).toBeLessThanOrEqual(155)
  })

  test('the invoice format guide covers "GST bill format"', () => {
    const page = GUIDES.pages.find(
      (entry) => entry.slug === 'gst-invoice-format',
    )
    expect(page?.seoTitle).toContain('GST Invoice Format / GST Bill Format')
  })

  test('the e-way bill guide says it is a JSON upload', () => {
    const guide = HELP_GUIDES.find(
      (entry) => entry.slug === 'generate-an-e-way-bill',
    )
    expect(guide?.seoTitle).toContain('(JSON Upload)')
  })
})
