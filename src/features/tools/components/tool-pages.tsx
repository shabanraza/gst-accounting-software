import { Link } from '@tanstack/react-router'

import {
  MarketingPageShell,
  PageHero,
  ProductPitch,
} from '#/features/marketing/components/content-page-parts.tsx'
import { SITE } from '#/features/marketing/landing-content.ts'
import { EInvoiceChecker } from '#/features/tools/components/e-invoice-checker.tsx'
import { GstCalculator } from '#/features/tools/components/gst-calculator.tsx'
import { GstDueDates } from '#/features/tools/components/gst-due-dates.tsx'
import { GstinValidator } from '#/features/tools/components/gstin-validator.tsx'
import {
  HsnChapterDetail,
  HsnChapterIndex,
  HsnFinder,
} from '#/features/tools/components/hsn-finder.tsx'
import { InvoiceGenerator } from '#/features/tools/components/invoice-generator.tsx'
import { PaymentReminder } from '#/features/tools/components/payment-reminder.tsx'
import { ToolCard, ToolPage } from '#/features/tools/components/tool-page.tsx'
import { GST_RATE_PAGES } from '#/features/tools/gst-calculator-service.ts'
import type { GstRatePage } from '#/features/tools/gst-calculator-service.ts'
import type { HsnChapter } from '#/features/tools/hsn-service.ts'
import { chapterPageCopy, ratePageCopy } from '#/features/tools/tool-head.ts'
import { TOOLS_HUB, TOOL_SLUGS } from '#/features/tools/tools-content.ts'

export function ToolsHubPage() {
  return (
    <MarketingPageShell>
      <PageHero crumbs={[{ label: 'Free tools' }]} headline={TOOLS_HUB.headline} intro={TOOLS_HUB.intro} />
      <section className="mx-auto max-w-6xl px-4 pb-12" data-ui="chrome">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_SLUGS.map((slug) => (
            <ToolCard key={slug} slug={slug} />
          ))}
        </div>
      </section>
      <ProductPitch
        body="Billing, purchases, stock, party ledgers, and GST reports on proper double-entry books. Free, in your browser."
        title={`When you outgrow single tools, try ${SITE.name}`}
      />
      <div className="pb-16" />
    </MarketingPageShell>
  )
}

function RateLinks() {
  return (
    <section className="mx-auto max-w-3xl px-4 pb-4" data-ui="chrome">
      <h2 className="font-heading text-lg font-semibold tracking-tight">Calculators by rate</h2>
      <ul className="mt-3 flex flex-wrap gap-2">
        {GST_RATE_PAGES.map((page) => (
          <li key={page.slug}>
            <Link
              className="inline-flex rounded-md bg-muted px-3 py-1.5 text-sm text-foreground hover:bg-muted/70"
              params={{ rate: page.slug }}
              to="/tools/gst-calculator/$rate"
            >
              {page.label} GST calculator
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function GstCalculatorPage() {
  return (
    <ToolPage belowArticle={<RateLinks />} slug="gst-calculator">
      <GstCalculator />
    </ToolPage>
  )
}

export function GstRatePageView({ page }: { page: GstRatePage }) {
  const copy = ratePageCopy(page)
  return (
    <ToolPage
      belowArticle={<RateLinks />}
      extraCrumb={page.label}
      headline={copy.headline}
      intro={copy.intro}
      slug="gst-calculator"
    >
      <GstCalculator key={page.slug} defaultRate={page.rate} />
    </ToolPage>
  )
}

export function InvoiceGeneratorPage() {
  return (
    <ToolPage slug="gst-invoice-generator">
      <InvoiceGenerator />
    </ToolPage>
  )
}

export function HsnFinderPage() {
  return (
    <ToolPage belowArticle={<HsnChapterIndex />} slug="hsn-code-finder">
      <HsnFinder />
    </ToolPage>
  )
}

export function HsnChapterPage({ chapter }: { chapter: HsnChapter }) {
  const copy = chapterPageCopy(chapter)
  return (
    <ToolPage
      extraCrumb={`Chapter ${chapter.code}`}
      headline={copy.headline}
      intro={copy.intro}
      slug="hsn-code-finder"
    >
      <div className="flex flex-col gap-6">
        <HsnChapterDetail chapter={chapter} />
        <HsnFinder />
      </div>
    </ToolPage>
  )
}

export function GstinValidatorPage() {
  return (
    <ToolPage slug="gstin-validator">
      <GstinValidator />
    </ToolPage>
  )
}

export function GstDueDatesPage() {
  return (
    <ToolPage slug="gst-due-dates">
      <GstDueDates />
    </ToolPage>
  )
}

export function EInvoiceCheckerPage() {
  return (
    <ToolPage slug="e-invoice-e-way-bill-checker">
      <EInvoiceChecker />
    </ToolPage>
  )
}

export function PaymentReminderPage() {
  return (
    <ToolPage slug="payment-reminder">
      <PaymentReminder />
    </ToolPage>
  )
}
