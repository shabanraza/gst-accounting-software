import { Link } from '@tanstack/react-router'
import { ArrowRightIcon, GitBranchIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { WaitlistForm } from '#/features/marketing/components/waitlist-form.tsx'
import { CLOSING_CTA } from '#/features/marketing/landing-content.ts'

export function LandingCta() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20" data-ui="chrome">
      <div
        className="flex flex-col items-start gap-5 rounded-[var(--radius-hero)] bg-primary px-6 py-10 text-primary-foreground shadow-(--elevation-2) md:flex-row md:items-center md:justify-between md:px-10"
        data-hero-surface=""
      >
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="font-heading text-2xl font-semibold tracking-tight">
            {CLOSING_CTA.title}
          </h2>
          <p className="text-sm text-primary-foreground/80">{CLOSING_CTA.body}</p>
          <div className="mt-2">
            <WaitlistForm />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg" variant="secondary">
            <Link to={CLOSING_CTA.primaryCta.to}>
              {CLOSING_CTA.primaryCta.label}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
          <Button
            asChild
            className="border-primary-foreground/20 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
            size="lg"
            variant="outline"
          >
            <a
              href={CLOSING_CTA.secondaryCta.href}
              rel="noreferrer"
              target="_blank"
            >
              <GitBranchIcon data-icon="inline-start" />
              {CLOSING_CTA.secondaryCta.label}
            </a>
          </Button>
        </div>
      </div>
    </section>
  )
}
