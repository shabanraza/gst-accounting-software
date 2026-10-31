import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, GitBranchIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent, CardHeader, CardTitle } from '#/components/ui/card.tsx'
import { ComparisonTable } from '#/features/marketing/components/comparison-table.tsx'
import { FeatureGrid } from '#/features/marketing/components/feature-grid.tsx'
import { LandingCta } from '#/features/marketing/components/landing-cta.tsx'
import { LandingFaq } from '#/features/marketing/components/landing-faq.tsx'
import { LandingFooter } from '#/features/marketing/components/landing-footer.tsx'
import { LandingHeader } from '#/features/marketing/components/landing-header.tsx'
import type { AlternativeSlug } from '#/features/marketing/alternatives-content.ts'
import {
  ALTERNATIVES,
  comparisonFact,
} from '#/features/marketing/alternatives-content.ts'
import { HERO, SITE } from '#/features/marketing/landing-content.ts'

export function AlternativePage({ slug }: { slug: AlternativeSlug }) {
  const alternative = ALTERNATIVES[slug]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        <section className="relative overflow-hidden" data-ui="chrome" id="top">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.02_95),transparent_55%),linear-gradient(180deg,var(--shell-canvas),var(--background)_70%)]"
          />
          <div className="relative mx-auto flex max-w-3xl flex-col gap-6 px-4 py-16 md:py-24">
            <p className="font-heading text-sm font-medium tracking-wide text-muted-foreground">
              {SITE.name} vs {alternative.name}
            </p>
            <h1 className="max-w-2xl font-heading text-3xl font-semibold tracking-tight text-balance text-foreground md:text-4xl">
              {alternative.headline}
            </h1>
            <p className="max-w-xl text-base text-pretty text-muted-foreground md:text-lg">
              {alternative.intro}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link to={HERO.primaryCta.to}>
                  {HERO.primaryCta.label}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href={HERO.secondaryCta.href} rel="noreferrer" target="_blank">
                  <GitBranchIcon data-icon="inline-start" />
                  {HERO.secondaryCta.label}
                </a>
              </Button>
            </div>
            {alternative.loginNotice ? (
              <a
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                href={alternative.loginNotice.href}
                rel="noreferrer nofollow"
              >
                {alternative.loginNotice.label}
              </a>
            ) : null}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-4" data-ui="chrome">
          <div className="grid gap-4 sm:grid-cols-3">
            {(
              [
                'Pricing model',
                'Self-hostable',
                'Source code available',
              ] as const
            ).map((rowLabel) => (
              <Card key={rowLabel} size="hero">
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">
                    {rowLabel}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-1 text-sm">
                  <p className="font-medium text-foreground">
                    {SITE.name}: {comparisonFact(rowLabel, 'HisaabKro')}
                  </p>
                  <p className="text-muted-foreground">
                    {alternative.name}: {comparisonFact(rowLabel, alternative.name)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <ComparisonTable />
        <FeatureGrid />
        <LandingFaq
          id="faq"
          items={alternative.faq}
          title={`Switching from ${alternative.name}`}
        />
        <LandingCta />
      </main>
      <LandingFooter />
    </div>
  )
}
