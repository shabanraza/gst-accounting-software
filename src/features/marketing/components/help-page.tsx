import { Link } from '@tanstack/react-router'

import { Card, CardDescription, CardHeader, CardTitle } from '#/components/ui/card.tsx'
import {
  MarketingPageShell,
  PageHero,
  ProductPitch,
} from '#/features/marketing/components/content-page-parts.tsx'
import { HelpSteps } from '#/features/marketing/components/help-steps.tsx'
import { HELP_GUIDES, HELP_HUB } from '#/features/marketing/help-content.ts'
import type { HelpGuide } from '#/features/marketing/help-content.ts'
import { SITE } from '#/features/marketing/landing-content.ts'

export function HelpHubPage() {
  return (
    <MarketingPageShell>
      <PageHero crumbs={[{ label: HELP_HUB.label }]} headline={HELP_HUB.headline} intro={HELP_HUB.intro} />
      <section className="mx-auto max-w-6xl px-4 pb-16" data-ui="chrome">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HELP_GUIDES.map((guide) => (
            <Link
              key={guide.slug}
              className="group rounded-[var(--radius-hero)] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              params={{ slug: guide.slug }}
              to="/help/$slug"
            >
              <Card className="h-full transition-shadow group-hover:shadow-(--elevation-2)" size="hero">
                <CardHeader>
                  <CardTitle className="text-base">{guide.title}</CardTitle>
                  <CardDescription className="text-sm">{guide.summary}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    </MarketingPageShell>
  )
}

export function HelpGuidePage({ guide }: { guide: HelpGuide }) {
  const others = HELP_GUIDES.filter((other) => other.slug !== guide.slug)

  return (
    <MarketingPageShell>
      <PageHero
        crumbs={[{ label: HELP_HUB.label, to: '/help' }, { label: guide.title }]}
        headline={guide.title}
        intro={guide.summary}
      />
      <section className="mx-auto max-w-6xl px-4 pt-4 pb-12" data-ui="chrome">
        <div className="max-w-3xl">
          <HelpSteps size="base" steps={guide.steps} />
        </div>
      </section>
      <ProductPitch
        body="Billing, purchases, stock, party ledgers, and GST reports on proper double-entry books. Free, in your browser."
        title={`Try it in ${SITE.name}`}
      />
      <section className="mx-auto max-w-6xl px-4 py-12" data-ui="chrome">
        <h2 className="font-heading text-xl font-semibold tracking-tight">More guides</h2>
        <ul className="mt-4 flex flex-wrap gap-2">
          {others.map((other) => (
            <li key={other.slug}>
              <Link
                className="inline-flex rounded-md bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-muted/70"
                params={{ slug: other.slug }}
                to="/help/$slug"
              >
                {other.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </MarketingPageShell>
  )
}
