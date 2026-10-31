export type ChangelogSectionLabel = 'New' | 'Improved' | 'Fixed'

export type ChangelogSection = {
  label: ChangelogSectionLabel
  items: Array<string>
}

export type ChangelogRelease = {
  version: string
  date: string
  sections: Array<ChangelogSection>
}

/** Keep a Changelog change types, shown to customers in plain words. */
export const SECTION_LABELS: Record<string, ChangelogSectionLabel> = {
  Added: 'New',
  Changed: 'Improved',
  Deprecated: 'Improved',
  Removed: 'Improved',
  Fixed: 'Fixed',
  Security: 'Fixed',
}

export const RELEASE_HEADING = /^## \[(\d+\.\d+\.\d+)\] - (\d{4}-\d{2}-\d{2})\s*$/

/** Parses a Keep a Changelog file into released versions, newest first. */
export function parseChangelog(markdown: string): Array<ChangelogRelease> {
  const releases: Array<ChangelogRelease> = []
  let release: ChangelogRelease | null = null
  let section: ChangelogSection | null = null

  for (const line of markdown.split(/\r?\n/)) {
    if (line.startsWith('## ')) {
      const match = RELEASE_HEADING.exec(line)
      release = match ? { version: match[1], date: match[2], sections: [] } : null
      section = null
      if (release) releases.push(release)
      continue
    }
    if (!release) continue

    if (line.startsWith('### ')) {
      const label = SECTION_LABELS[line.slice(4).trim()] as
        | ChangelogSectionLabel
        | undefined
      section = label
        ? (release.sections.find((entry) => entry.label === label) ?? null)
        : null
      if (label && !section) {
        section = { label, items: [] }
        release.sections.push(section)
      }
      continue
    }

    if (section && line.startsWith('- ')) {
      section.items.push(line.slice(2).trim())
    }
  }

  return releases
}

/**
 * Releases newer than the one this viewer last saw. A viewer with no record,
 * or a record from a removed version, sees only the latest release as new.
 */
export function countUnseenReleases(
  releases: Array<ChangelogRelease>,
  lastSeenVersion: string | null,
): number {
  const index = releases.findIndex(
    (release) => release.version === lastSeenVersion,
  )
  if (index === -1) return Math.min(releases.length, 1)
  return index
}
