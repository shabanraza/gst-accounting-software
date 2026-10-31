import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

import {
  countUnseenReleases,
  parseChangelog,
} from '#/features/changelog/changelog.ts'

const sample = `# Changelog

Intro text.

## [Unreleased]

### Added

- Not shipped yet.

## [0.2.0] - 2026-10-28

### Added

- Stock value that matches the books.

### Changed

- Faster page navigation.
- Dashboard figures appear before the charts.

### Fixed

- Error messages are readable.

## [0.1.0] - 2026-10-27

### Fixed

- Invoices save completely or not at all.

[0.2.0]: https://example.com/compare/v0.1.0...v0.2.0
`

describe('parseChangelog', () => {
  it('returns released versions newest first, skipping Unreleased', () => {
    const releases = parseChangelog(sample)

    expect(releases.map((release) => release.version)).toEqual([
      '0.2.0',
      '0.1.0',
    ])
    expect(releases[0].date).toBe('2026-10-28')
  })

  it('maps Keep a Changelog types to New / Improved / Fixed', () => {
    const [latest] = parseChangelog(sample)

    expect(latest.sections).toEqual([
      { label: 'New', items: ['Stock value that matches the books.'] },
      {
        label: 'Improved',
        items: [
          'Faster page navigation.',
          'Dashboard figures appear before the charts.',
        ],
      },
      { label: 'Fixed', items: ['Error messages are readable.'] },
    ])
  })

  it('ignores link reference lines', () => {
    const releases = parseChangelog(sample)

    expect(releases[1].sections).toEqual([
      { label: 'Fixed', items: ['Invoices save completely or not at all.'] },
    ])
  })
})

describe('countUnseenReleases', () => {
  const releases = parseChangelog(sample)

  it('counts releases newer than the last one seen', () => {
    expect(countUnseenReleases(releases, '0.1.0')).toBe(1)
    expect(countUnseenReleases(releases, '0.2.0')).toBe(0)
  })

  it('treats a viewer who has seen nothing as having one unseen release', () => {
    expect(countUnseenReleases(releases, null)).toBe(1)
  })

  it('treats an unknown version as one unseen release', () => {
    expect(countUnseenReleases(releases, '9.9.9')).toBe(1)
  })
})

describe('repository CHANGELOG.md', () => {
  const changelog = readFileSync('CHANGELOG.md', 'utf8')
  const releases = parseChangelog(changelog)
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    version: string
  }

  it('has dated releases with at least one entry each', () => {
    expect(releases.length).toBeGreaterThan(0)
    for (const release of releases) {
      expect(release.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(release.sections.flatMap((section) => section.items).length)
        .toBeGreaterThan(0)
    }
  })

  it('matches the package.json version', () => {
    expect(releases[0].version).toBe(pkg.version)
  })
})
