import { format, parseISO } from 'date-fns'

import changelogMarkdown from '../../../CHANGELOG.md?raw'

import { parseChangelog } from '#/features/changelog/changelog.ts'
import type {
  ChangelogSectionLabel,
} from '#/features/changelog/changelog.ts'
import type { BadgeIntent } from '#/lib/badge-intent.ts'

/** Released versions from CHANGELOG.md, newest first. */
export const RELEASES = parseChangelog(changelogMarkdown)

export const APP_VERSION = RELEASES[0]?.version ?? '0.0.0'

export const SECTION_BADGE: Record<ChangelogSectionLabel, BadgeIntent> = {
  New: 'success',
  Improved: 'info',
  Fixed: 'neutral',
}

export function formatReleaseDate(date: string) {
  return format(parseISO(date), 'd MMMM yyyy')
}
