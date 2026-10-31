import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, ChevronRightIcon } from 'lucide-react'

import type * as React from 'react'

import { Button } from '#/components/ui/button.tsx'
import { LandingFooter } from '#/features/marketing/components/landing-footer.tsx'
import { LandingHeader } from '#/features/marketing/components/landing-header.tsx'
import { HERO } from '#/features/marketing/landing-content.ts'
import type { ContentSection } from '#/features/marketing/page-head.ts'


export function MarketingPageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>{children}</main>
      <LandingFooter />
    </div>
  )
}

export function PageHero(props: {
  crumbs: ReadonlyArray<{ label: string; href?: string }>
  headline: string
  intro: string
  children?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden" data-ui="chrome" id="top">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.02_95),transparent_55%),linear-gradient(180deg,var(--shell-canvas),var(--background)_70%)] dark:bg-[linear-gradient(180deg,var(--shell-canvas),var(--background)_70%)]"
      />
      <div className="relative mx-auto flex max-w-4xl flex-col gap-4 px-4 pt-12 pb-8 md:pt-16">
        <nav aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
            {props.crumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1">
                {index > 0 ? <ChevronRightIcon className="size-3.5" /> : null}
                {crumb.href ? (
                  <a className="hover:text-foreground" href={crumb.href}>
                    {crumb.label}
                  </a>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="max-w-3xl font-heading text-3xl font-semibold tracking-tight text-balance md:text-4xl">
          {props.headline}
        </h1>
        <p className="max-w-2xl text-base text-pretty text-muted-foreground md:text-lg">
          {props.intro}
        </p>
        {props.children}
      </div>
    </section>
  )
}

export function ArticleSections({ sections }: { sections: ReadonlyArray<ContentSection> }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12" data-ui="chrome">
      <div className="flex flex-col gap-10">
        {sections.map((section) => (
          <article key={section.heading} className="flex flex-col gap-3">
            <h2 className="font-heading text-xl font-semibold tracking-tight md:text-2xl">
              {section.heading}
            </h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="text-base leading-relaxed text-pretty text-muted-foreground">
                {paragraph}
              </p>
            ))}
          </article>
        ))}
      </div>
    </section>
  )
}

export function ProductPitch({ title, body }: { title: string; body: string }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-4" data-ui="chrome">
      <div
        className="flex flex-col items-start gap-4 rounded-[var(--radius-hero)] bg-primary px-6 py-8 text-primary-foreground shadow-(--elevation-2) md:flex-row md:items-center md:justify-between md:px-8"
        data-hero-surface=""
      >
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight">{title}</h2>
          <p className="text-sm text-primary-foreground/80">{body}</p>
        </div>
        <Button asChild size="lg" variant="secondary">
          <Link to={HERO.primaryCta.to}>
            {HERO.primaryCta.label}
            <ArrowRightIcon data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
