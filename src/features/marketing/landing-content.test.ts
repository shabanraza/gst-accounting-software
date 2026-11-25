import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

import { describe, expect, test } from 'vitest'

import {
  FAQ,
  HERO,
  HERO_SCREENSHOT,
  SHOWCASE,
  SITE,
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildSoftwareJsonLd,
} from '#/features/marketing/landing-content.ts'
import { smallScreenshotSrc } from '#/features/marketing/components/app-screenshot.tsx'

describe('landing content', () => {
  test('FAQPage JSON-LD includes every visible FAQ answer', () => {
    const jsonLd = buildFaqJsonLd()
    expect(jsonLd['@type']).toBe('FAQPage')
    expect(jsonLd.mainEntity).toHaveLength(FAQ.items.length)

    for (const item of FAQ.items) {
      const entity = jsonLd.mainEntity.find(
        (entry) => entry.name === item.question,
      )
      expect(entity).toBeDefined()
      expect(entity?.acceptedAnswer.text).toBe(item.answer)
    }
  })

  test('SoftwareApplication JSON-LD is free INR offer', () => {
    const jsonLd = buildSoftwareJsonLd()
    expect(jsonLd.name).toBe(SITE.name)
    expect(jsonLd.offers.price).toBe('0')
    expect(jsonLd.offers.priceCurrency).toBe('INR')
    expect(jsonLd.image).toBe(SITE.ogImage)
  })

  test('OG card URL is absolute and points at the public asset', () => {
    expect(SITE.ogImage).toBe('https://hisaabkro.in/og-card.png')
  })

  test('primary CTA targets signup', () => {
    expect(HERO.primaryCta.to).toBe('/signup')
    expect(HERO.secondaryCta.href).toBe(SITE.githubUrl)
  })

  test('landing sources never import app shell or trpc client', () => {
    const forbidden = [
      'AppShell',
      'WorkspaceProvider',
      'WorkspaceLoadingGate',
      'trpcClient',
      'integrations/tanstack-query/root-provider',
    ]
    const root = path.resolve(import.meta.dirname)
    const files = [
      'landing-content.ts',
      'components/landing-page.tsx',
      'components/landing-header.tsx',
      'components/landing-hero.tsx',
      'components/app-screenshot.tsx',
      'components/ask-ai-demo.tsx',
      'components/trust-strip.tsx',
      'components/feature-showcase.tsx',
      'components/pathway-cards.tsx',
      'components/security-section.tsx',
      'components/feature-grid.tsx',
      'components/comparison-table.tsx',
      'components/landing-faq.tsx',
      'components/landing-cta.tsx',
      'components/landing-footer.tsx',
      'components/alternative-page.tsx',
    ]

    for (const file of files) {
      const source = readFileSync(path.join(root, file), 'utf8')
      for (const token of forbidden) {
        expect(source, `${file} must not mention ${token}`).not.toContain(token)
      }
    }
  })

  test('title and description fit what Google shows in results', () => {
    expect(SITE.title.length).toBeLessThanOrEqual(60)
    expect(SITE.title).toContain('GST Billing')
    expect(SITE.description.length).toBeLessThanOrEqual(155)
  })

  test('Organization JSON-LD names the product and links its profiles', () => {
    const jsonLd = buildOrganizationJsonLd()
    expect(jsonLd['@type']).toBe('Organization')
    expect(jsonLd.name).toBe(SITE.name)
    expect(jsonLd.url).toBe(SITE.url)
    expect(jsonLd.logo).toBe(`${SITE.url}/icon-512.png`)
    expect(jsonLd.sameAs).toContain(SITE.githubUrl)
  })

  test('every screenshot is a sized WebP with descriptive alt text', () => {
    for (const shot of [
      HERO_SCREENSHOT,
      ...SHOWCASE.items.flatMap((item) =>
        'screenshot' in item ? [item.screenshot] : [],
      ),
    ]) {
      expect(shot.src).toMatch(/^\/screenshots\/[a-z0-9-]+\.webp$/)
      expect(shot.width).toBeGreaterThan(0)
      expect(shot.height).toBeGreaterThan(0)
      expect(shot.alt.length).toBeGreaterThan(20)
      expect(existsSync(path.join('public', shot.src))).toBe(true)
      expect(
        existsSync(path.join('public', smallScreenshotSrc(shot.src))),
      ).toBe(true)
    }
  })
})
