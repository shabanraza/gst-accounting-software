import { Link } from '@tanstack/react-router'
import { ArrowRightIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { Card, CardContent } from '#/components/ui/card.tsx'
import { ContactForm } from '#/features/marketing/components/contact-form.tsx'
import { CONTACT } from '#/features/marketing/landing-content.ts'

export function LandingContact() {
  return (
    <section
      className="mx-auto max-w-6xl px-4 py-16 md:py-20"
      data-ui="chrome"
      id={CONTACT.id}
    >
      <div className="grid gap-8 md:grid-cols-[1fr_1.2fr] md:items-start">
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {CONTACT.title}
          </h2>
          <p className="max-w-md text-sm text-muted-foreground">
            {CONTACT.subtitle}
          </p>
          <p className="text-sm text-muted-foreground">{CONTACT.responseTime}</p>
          <Button asChild className="self-start" size="sm" variant="outline">
            <Link to="/contact">
              More contact options
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent>
            <ContactForm variant="compact" />
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
