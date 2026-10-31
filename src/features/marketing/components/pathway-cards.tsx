import { Link } from '@tanstack/react-router'
import {
  ArrowRightIcon,
  ArrowRightLeftIcon,
  BriefcaseIcon,
  CodeIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { PATHWAYS } from '#/features/marketing/landing-content.ts'

const ICONS = [ArrowRightLeftIcon, BriefcaseIcon, CodeIcon] as const

/** Three ways in: switching from Tally, accountants, and developers. */
export function PathwayCards() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
      <div className="grid gap-4 md:grid-cols-3">
        {PATHWAYS.map((pathway, index) => {
          const Icon = ICONS[index]
          return (
            <Card key={pathway.title} size="hero">
              <CardHeader className="flex flex-col gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <CardTitle className="text-lg">{pathway.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground">
                {pathway.body}
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline">
                  {'href' in pathway.cta ? (
                    <a href={pathway.cta.href} rel="noreferrer" target="_blank">
                      {pathway.cta.label}
                      <ArrowRightIcon data-icon="inline-end" />
                    </a>
                  ) : pathway.cta.to === '/alternatives/tally' ? (
                    <Link
                      params={{ competitor: 'tally' }}
                      to="/alternatives/$competitor"
                    >
                      {pathway.cta.label}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  ) : (
                    <Link to={pathway.cta.to}>
                      {pathway.cta.label}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  )}
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
