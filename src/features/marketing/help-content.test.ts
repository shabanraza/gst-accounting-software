import { describe, expect, test } from 'vitest'

import { appNav } from '#/features/app-shell/data/app-shell-nav.ts'
import {
  HELP_GUIDES,
  buildHelpGuideHead,
  findHelpGuide,
  parseStep,
  stepPlainText,
} from '#/features/marketing/help-content.ts'

/** Header menu entries that are not in the sidebar. */
const HEADER_MENUS = new Map<string, ReadonlyArray<string>>([
  ['New bill', ['New sales invoice', 'New purchase bill', 'Record payment']],
])

function menuPathExists(group: string, item: string) {
  if (HEADER_MENUS.get(group)?.includes(item)) return true
  return appNav.some(
    (section) =>
      section.kind === 'group' &&
      section.label === group &&
      section.items.some((entry) => entry.label === item),
  )
}

describe('help guides content', () => {
  test('has 8 to 10 guides with unique slugs and SEO text', () => {
    expect(HELP_GUIDES.length).toBeGreaterThanOrEqual(8)
    expect(HELP_GUIDES.length).toBeLessThanOrEqual(10)
    for (const field of ['slug', 'title', 'seoTitle', 'seoDescription'] as const) {
      const values = HELP_GUIDES.map((guide) => guide[field])
      expect(new Set(values).size).toBe(values.length)
    }
    for (const guide of HELP_GUIDES) {
      expect(guide.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(guide.seoDescription.length).toBeLessThanOrEqual(200)
    }
  })

  test('each guide is a short numbered list of 4 to 8 steps', () => {
    for (const guide of HELP_GUIDES) {
      expect(guide.steps.length, guide.slug).toBeGreaterThanOrEqual(4)
      expect(guide.steps.length, guide.slug).toBeLessThanOrEqual(8)
    }
  })

  test('every label marker is closed', () => {
    for (const guide of HELP_GUIDES) {
      for (const step of guide.steps) {
        expect(step.split('**').length % 2, step).toBe(1)
      }
    }
  })

  test('"Group → Page" labels name a real sidebar or header menu entry', () => {
    for (const guide of HELP_GUIDES) {
      for (const step of guide.steps) {
        for (const segment of parseStep(step)) {
          if (!segment.label || !segment.text.includes(' → ')) continue
          const [group, item] = segment.text.split(' → ')
          expect(menuPathExists(group, item), segment.text).toBe(true)
        }
      }
    }
  })

  test('each guide starts on an app page', () => {
    for (const guide of HELP_GUIDES) {
      expect(guide.appPath).toMatch(/^\/app\//)
    }
  })

  test('parseStep splits labels from plain text', () => {
    expect(parseStep('Open **Settings** and choose **Invite**.')).toEqual([
      { text: 'Open ', label: false },
      { text: 'Settings', label: true },
      { text: ' and choose ', label: false },
      { text: 'Invite', label: true },
      { text: '.', label: false },
    ])
    expect(stepPlainText('Choose **Save bill**.')).toBe('Choose Save bill.')
  })

  test('HowTo JSON-LD mirrors the visible steps', () => {
    const guide = findHelpGuide('create-a-sales-invoice')
    expect(guide).toBeDefined()
    if (!guide) return
    const head = buildHelpGuideHead(guide)
    const howTo = JSON.parse(head.scripts[0].children) as {
      '@type': string
      step: Array<{ text: string }>
    }
    expect(howTo['@type']).toBe('HowTo')
    expect(howTo.step.map((step) => step.text)).toEqual(guide.steps.map(stepPlainText))
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://hisaabkro.in/help/create-a-sales-invoice' },
    ])
    expect(findHelpGuide('not-a-guide')).toBeUndefined()
  })

  test('guide titles and steps stay stable', () => {
    expect(
      HELP_GUIDES.map((guide) => `${guide.title} (${guide.steps.length} steps)`),
    ).toMatchInlineSnapshot(`
      [
        "Set up your company (6 steps)",
        "Add a customer, supplier or item (8 steps)",
        "Create a sales invoice (7 steps)",
        "Record a purchase bill (6 steps)",
        "Record a payment or receipt (6 steps)",
        "Record a sales or purchase return (5 steps)",
        "Get your GSTR-1 and GSTR-3B figures (6 steps)",
        "Export to Tally or back up your data (4 steps)",
        "Invite a team member (5 steps)",
      ]
    `)
  })
})
