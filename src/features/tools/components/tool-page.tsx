import { Link } from '@tanstack/react-router'
import {
  BadgeCheckIcon,
  CalculatorIcon,
  CalendarClockIcon,
  FileTextIcon,
  MessageCircleIcon,
  SearchIcon,
  TruckIcon,
} from 'lucide-react'

import type { CSSProperties } from 'react'
import type * as React from 'react'

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
import { SITE } from '#/features/marketing/landing-content.ts'
import { TOOLS, TOOL_SLUGS, toolPath } from '#/features/tools/tools-content.ts'
import type { ToolSlug, ToolTone } from '#/features/tools/tools-content.ts'

export const TOOL_ICON: Record<ToolSlug, typeof CalculatorIcon> = {
  'gst-calculator': CalculatorIcon,
  'gst-invoice-generator': FileTextIcon,
  'hsn-code-finder': SearchIcon,
  'gstin-validator': BadgeCheckIcon,
  'gst-due-dates': CalendarClockIcon,
  'e-invoice-e-way-bill-checker': TruckIcon,
  'payment-reminder': MessageCircleIcon,
}

const TONE_VAR: Record<ToolTone, string> = {
  'money-in': 'var(--money-in)',
  'money-out': 'var(--money-out)',
  gst: 'var(--gst)',
  inventory: 'var(--inventory)',
  banking: 'var(--banking)',
}

export function ToolCard({ slug }: { slug: ToolSlug }) {
  const tool = TOOLS[slug]
  const Icon = TOOL_ICON[slug]
  return (
    <Link className="group rounded-[var(--radius-hero)] outline-none focus-visible:ring-2 focus-visible:ring-ring/30" to={toolPath(slug)}>
      <Card className="h-full transition-shadow group-hover:shadow-(--elevation-2)" size="hero">
        <CardHeader>
          <div
            className="icon-duotone mb-2 grid size-10 place-items-center rounded-full bg-[color-mix(in_oklch,var(--icon-tone)_16%,transparent)]"
            style={{ '--icon-tone': TONE_VAR[tool.tone] } as CSSProperties}
          >
            <Icon className="size-5" data-icon-stroke="" style={{ color: TONE_VAR[tool.tone] }} />
          </div>
          <CardTitle className="text-base">{tool.name}</CardTitle>
          <CardDescription className="text-sm">{tool.summary}</CardDescription>
        </CardHeader>
      </Card>
    </Link>
  )
}

export function ToolPage({
  slug,
  headline,
  intro,
  extraCrumb,
  children,
  belowArticle,
}: {
  slug: ToolSlug
  headline?: string
  intro?: string
  extraCrumb?: string
  children: React.ReactNode
  belowArticle?: React.ReactNode
}) {
  const tool = TOOLS[slug]
  const crumbs = [
    { label: 'Free tools', to: '/tools' as const },
    extraCrumb ? { label: tool.name, to: toolPath(slug) } : { label: tool.name },
    ...(extraCrumb ? [{ label: extraCrumb }] : []),
  ]

  return (
    <MarketingPageShell>
      <PageHero crumbs={crumbs} headline={headline ?? tool.headline} intro={intro ?? tool.intro} />
      <section className="mx-auto max-w-6xl px-4 pb-8">{children}</section>
      <ProductPitch body={tool.productPitch} title={`Do this every day in ${SITE.name}`} />
      <ArticleSections sections={tool.sections} />
      {belowArticle}
      <LandingFaq align="start" id="faq" items={tool.faq} title={`${tool.name}: common questions`} />
      <section className="mx-auto max-w-6xl px-4 pb-16" data-ui="chrome">
        <h2 className="font-heading text-xl font-semibold tracking-tight">More free GST tools</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOOL_SLUGS.filter((other) => other !== slug).map((other) => (
            <ToolCard key={other} slug={other} />
          ))}
        </div>
      </section>
    </MarketingPageShell>
  )
}
