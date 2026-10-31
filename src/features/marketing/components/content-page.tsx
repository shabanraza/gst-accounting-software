import { Link } from '@tanstack/react-router'

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import {
  ArticleSections,
  MarketingPageShell,
  PageHero,
  ProductPitch,
} from '#/features/marketing/components/content-page-parts.tsx'
import { LandingFaq } from '#/features/marketing/components/landing-faq.tsx'
import type { ContentCollection, ContentPage } from '#/features/marketing/content-pages.ts'
import { SITE } from '#/features/marketing/landing-content.ts'
import { ToolCard } from '#/features/tools/components/tool-page.tsx'
import { TOOL_SLUGS } from '#/features/tools/tools-content.ts'
import type { ToolSlug } from '#/features/tools/tools-content.ts'

function isToolSlug(value: string): value is ToolSlug {
  return (TOOL_SLUGS as ReadonlyArray<string>).includes(value)
}

export function ContentArticlePage({
  collection,
  page,
}: {
  collection: ContentCollection
  page: ContentPage
}) {
  const tools = page.relatedTools.filter(isToolSlug)
  const others = collection.pages.filter((other) => other.slug !== page.slug)

  return (
    <MarketingPageShell>
      <PageHero
        crumbs={[{ label: collection.hubLabel, href: collection.basePath }, { label: page.label }]}
        headline={page.headline}
        intro={page.intro}
      />
      <ArticleSections sections={page.sections} />
      <ProductPitch
        body="Billing, purchases, stock, party ledgers, and GST reports on proper double-entry books. Free, in your browser."
        title={`Run your GST billing in ${SITE.name}`}
      />
      <LandingFaq id="faq" items={page.faq} title="Common questions" />
      {tools.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-12" data-ui="chrome">
          <h2 className="font-heading text-xl font-semibold tracking-tight">Free tools for this</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((slug) => (
              <ToolCard key={slug} slug={slug} />
            ))}
          </div>
        </section>
      ) : null}
      {others.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-16" data-ui="chrome">
          <h2 className="font-heading text-xl font-semibold tracking-tight">More in {collection.hubLabel}</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {others.map((other) => (
              <li key={other.slug}>
                <a
                  className="inline-flex rounded-md bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-muted/70"
                  href={`${collection.basePath}/${other.slug}`}
                >
                  {other.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </MarketingPageShell>
  )
}

export function ContentHubPage({
  collection,
  headline,
  intro,
}: {
  collection: ContentCollection
  headline: string
  intro: string
}) {
  return (
    <MarketingPageShell>
      <PageHero crumbs={[{ label: collection.hubLabel }]} headline={headline} intro={intro} />
      <section className="mx-auto max-w-6xl px-4 pb-16" data-ui="chrome">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {collection.pages.map((page) => (
            <a
              key={page.slug}
              className="group rounded-[var(--radius-hero)] outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              href={`${collection.basePath}/${page.slug}`}
            >
              <Card className="h-full transition-shadow group-hover:shadow-(--elevation-2)" size="hero">
                <CardHeader>
                  <CardTitle className="text-base">{page.label}</CardTitle>
                  <CardDescription className="text-sm">{page.seoDescription}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          ))}
        </div>
      </section>
      <div className="flex justify-center pb-16">
        <Link className="text-sm text-muted-foreground hover:text-foreground" to="/tools">
          Browse the free GST tools
        </Link>
      </div>
    </MarketingPageShell>
  )
}
