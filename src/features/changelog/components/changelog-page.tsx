import { Card, CardContent } from '#/components/ui/card.tsx'
import { ReleaseNotes } from '#/features/changelog/components/release-notes.tsx'
import {
  RELEASES,
  formatReleaseDate,
} from '#/features/changelog/releases.ts'
import { LandingFooter } from '#/features/marketing/components/landing-footer.tsx'
import { LandingHeader } from '#/features/marketing/components/landing-header.tsx'
import { SITE } from '#/features/marketing/landing-content.ts'

export function ChangelogPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-12 md:py-16">
        <div className="flex flex-col gap-2">
          <p className="font-heading text-sm font-medium tracking-wide text-muted-foreground">
            {SITE.name}
          </p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            Changelog
          </h1>
          <p className="text-base text-muted-foreground">
            New features, improvements and fixes in every release.
          </p>
        </div>

        <ol className="flex flex-col gap-8">
          {RELEASES.map((release) => (
            <li
              key={release.version}
              className="grid scroll-mt-20 gap-3 md:grid-cols-[10rem_1fr] md:gap-8"
              id={`v${release.version}`}
            >
              <div className="flex flex-col gap-0.5 md:pt-4">
                <time
                  className="text-sm font-medium text-foreground"
                  dateTime={release.date}
                >
                  {formatReleaseDate(release.date)}
                </time>
                <a
                  className="text-xs text-muted-foreground hover:text-foreground"
                  href={`#v${release.version}`}
                >
                  v{release.version}
                </a>
              </div>
              <Card>
                <CardContent>
                  <ReleaseNotes release={release} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </main>
      <LandingFooter />
    </div>
  )
}
