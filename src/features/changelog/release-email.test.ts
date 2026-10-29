import { describe, expect, test } from 'vitest'

import {
  buildBroadcastRequest,
  buildReleaseEmail,
  findRelease,
  releasesInMonth,
} from '#/features/changelog/release-email.ts'

const changelog = `# Changelog

Intro text.

## [Unreleased]

### Added

- Not shipped yet.

## [0.3.0] - 2026-11-20

### Added

- **Bulk** payments from the \`Payments\` page.
- See [the guide](https://hisaabkro.in/help/payments).

### Fixed

- Totals round correctly.

## [0.2.1] - 2026-11-02

### Fixed

- GSTR-1 export opens in Excel.

## [0.2.0] - 2026-10-28

### Changed

- New companies start with clean books.
`

describe('findRelease', () => {
  test('returns the notes of one released version', () => {
    expect(findRelease(changelog, '0.2.1')).toEqual({
      version: '0.2.1',
      date: '2026-11-02',
      markdown: '### Fixed\n\n- GSTR-1 export opens in Excel.',
    })
  })

  test('accepts a tag with a leading v', () => {
    expect(findRelease(changelog, 'v0.3.0')?.version).toBe('0.3.0')
  })

  test('returns null for unknown or unreleased versions', () => {
    expect(findRelease(changelog, '9.9.9')).toBeNull()
    expect(findRelease(changelog, 'Unreleased')).toBeNull()
  })
})

describe('releasesInMonth', () => {
  test('returns the month’s releases, newest first', () => {
    expect(
      releasesInMonth(changelog, '2026-11').map((release) => release.version),
    ).toEqual(['0.3.0', '0.2.1'])
    expect(releasesInMonth(changelog, '2026-09')).toEqual([])
  })
})

describe('buildReleaseEmail', () => {
  const release = findRelease(changelog, '0.3.0')!

  test('names the version in the subject', () => {
    expect(buildReleaseEmail([release]).subject).toBe(
      'What’s new in HisaabKro 0.3.0',
    )
  })

  test('shows sections in customer words with their items', () => {
    const { html } = buildReleaseEmail([release])

    expect(html).toContain('>New</h3>')
    expect(html).toContain('>Fixed</h3>')
    expect(html).not.toContain('Added')
    expect(html).toContain('<li')
    expect(html).toContain('Totals round correctly.')
  })

  test('renders bold, code and safe links', () => {
    const { html } = buildReleaseEmail([release])

    expect(html).toContain('<strong>Bulk</strong>')
    expect(html).toContain('<code')
    expect(html).toContain('href="https://hisaabkro.in/help/payments"')
    expect(html).toContain('>the guide</a>')
  })

  test('escapes HTML and drops non-http links', () => {
    const { html } = buildReleaseEmail([
      {
        version: '1.0.0',
        date: '2026-12-01',
        markdown:
          '### Fixed\n\n- <script>alert(1)</script>\n- [x](javascript:alert(1))',
      },
    ])

    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
    expect(html).not.toContain('javascript:')
  })

  test('keeps headings and paragraphs from free-form GitHub release notes', () => {
    const { html } = buildReleaseEmail([
      {
        version: '1.0.0',
        date: null,
        markdown: '## Highlights\n\nFaster reports.\n\n- One thing',
      },
    ])

    expect(html).toContain('>Highlights</h3>')
    expect(html).toContain('<p')
    expect(html).toContain('Faster reports.')
  })

  test('always carries the Resend unsubscribe link and the changelog link', () => {
    const { html } = buildReleaseEmail([release])

    expect(html).toContain('{{{RESEND_UNSUBSCRIBE_URL}}}')
    expect(html).toContain('https://hisaabkro.in/changelog')
  })

  test('a monthly digest lists every release under its version', () => {
    const { subject, html } = buildReleaseEmail(
      releasesInMonth(changelog, '2026-11'),
      { month: '2026-11' },
    )

    expect(subject).toBe('HisaabKro updates for November 2026')
    expect(html).toContain('0.3.0')
    expect(html).toContain('0.2.1')
    expect(html).toContain('GSTR-1 export opens in Excel.')
  })
})

describe('buildBroadcastRequest', () => {
  const base = {
    segmentId: 'seg_1',
    from: 'HisaabKro <updates@hisaabkro.in>',
    name: 'Release 0.3.0',
    email: { subject: 'What’s new', html: '<p>x</p>' },
  }

  test('is a draft when no send time is given', () => {
    const body = buildBroadcastRequest(base)

    expect(body).toMatchObject({
      segment_id: 'seg_1',
      from: 'HisaabKro <updates@hisaabkro.in>',
      reply_to: 'support@hisaabkro.in',
      subject: 'What’s new',
      html: '<p>x</p>',
      name: 'Release 0.3.0',
    })
    expect(body).not.toHaveProperty('send')
    expect(body).not.toHaveProperty('scheduled_at')
  })

  test('schedules the send when a send time is given', () => {
    expect(buildBroadcastRequest({ ...base, sendAt: 'in 1 hour' })).toMatchObject(
      { send: true, scheduled_at: 'in 1 hour' },
    )
  })

  test('treats "draft" or an empty send time as a draft', () => {
    expect(buildBroadcastRequest({ ...base, sendAt: 'draft' })).not.toHaveProperty('send')
    expect(buildBroadcastRequest({ ...base, sendAt: ' ' })).not.toHaveProperty('send')
  })
})
