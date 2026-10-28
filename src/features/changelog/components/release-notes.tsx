import { Badge } from '#/components/ui/badge.tsx'
import type { ChangelogRelease } from '#/features/changelog/changelog.ts'
import { SECTION_BADGE } from '#/features/changelog/releases.ts'

/** The New / Improved / Fixed lists of one release. */
export function ReleaseNotes({ release }: { release: ChangelogRelease }) {
  return (
    <div className="flex flex-col gap-4">
      {release.sections.map((section) => (
        <div key={section.label} className="flex flex-col gap-2">
          <Badge variant={SECTION_BADGE[section.label]}>{section.label}</Badge>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm text-pretty text-foreground marker:text-muted-foreground">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
