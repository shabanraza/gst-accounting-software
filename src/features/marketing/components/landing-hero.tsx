import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  GitBranchIcon,
  MessageCircleIcon,
  PackageCheckIcon,
  ReceiptIndianRupeeIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { APP_VERSION } from '#/features/changelog/releases.ts'
import { AppScreenshot } from '#/features/marketing/components/app-screenshot.tsx'
import {
  HERO,
  HERO_CALLOUTS,
  HERO_SCREENSHOT,
} from '#/features/marketing/landing-content.ts'
import { cn } from '#/lib/utils.ts'

const CALLOUT_ICON = {
  whatsapp: MessageCircleIcon,
  gst: ReceiptIndianRupeeIcon,
  stock: PackageCheckIcon,
} as const

/** Where each floating callout sits around the screenshot on wide screens. */
const CALLOUT_POSITION = [
  '-left-6 bottom-16',
  '-right-6 top-24',
  '-right-4 bottom-8',
] as const

export function LandingHero() {
  return (
    <section className="relative overflow-hidden" id="top">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,oklch(0.94_0.02_95),transparent_60%),linear-gradient(180deg,var(--shell-canvas),var(--background)_75%)]"
      />
      <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="flex max-w-3xl flex-col items-center gap-6 text-center">
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-(--elevation-1) transition-colors hover:text-foreground"
            to="/changelog"
          >
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">
              New
            </span>
            What's new in v{APP_VERSION}
            <ArrowRightIcon className="size-3" />
          </Link>
          <h1 className="font-heading text-4xl font-semibold tracking-tight text-balance text-foreground md:text-6xl">
            {HERO.headline}
          </h1>
          <p className="max-w-2xl text-base text-pretty text-muted-foreground md:text-lg">
            {HERO.subhead}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
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
          <p className="text-sm text-muted-foreground">{HERO.reassurance}</p>
        </div>

        <div className="relative w-full max-w-5xl">
          <AppScreenshot priority shot={HERO_SCREENSHOT} />
          {HERO_CALLOUTS.map((callout, index) => {
            const Icon = CALLOUT_ICON[callout.icon]
            return (
              <div
                aria-hidden="true"
                className={cn(
                  'absolute hidden items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium shadow-(--elevation-2) lg:flex',
                  CALLOUT_POSITION[index],
                )}
                key={callout.label}
              >
                <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-primary">
                  <Icon className="size-3.5" />
                </span>
                {callout.label}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
