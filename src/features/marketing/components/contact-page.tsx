import { Link } from '@tanstack/react-router'
import { BugIcon, ClockIcon, LogInIcon } from 'lucide-react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '#/components/ui/card.tsx'
import { ContactForm } from '#/features/marketing/components/contact-form.tsx'
import { LandingFooter } from '#/features/marketing/components/landing-footer.tsx'
import { LandingHeader } from '#/features/marketing/components/landing-header.tsx'
import { CONTACT, SITE } from '#/features/marketing/landing-content.ts'

export function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main
        className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 md:py-16"
        data-ui="chrome"
      >
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-4xl">
            {CONTACT.pageTitle}
          </h1>
          <p className="text-sm text-muted-foreground md:text-base">
            {CONTACT.subtitle}
          </p>
        </div>
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <Card>
            <CardContent>
              <ContactForm variant="full" />
            </CardContent>
          </Card>
          <div className="flex flex-col gap-4">
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <ClockIcon className="size-4 text-muted-foreground" />
                  Response time
                </CardTitle>
                <CardDescription>{CONTACT.responseTime}</CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <BugIcon className="size-4 text-muted-foreground" />
                  Bugs & feature requests
                </CardTitle>
                <CardDescription>
                  <a
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    href={`${SITE.githubUrl}/issues`}
                    rel="noreferrer"
                    target="_blank"
                  >
                    Open an issue on GitHub
                  </a>
                </CardDescription>
              </CardHeader>
            </Card>
            <Card size="sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <LogInIcon className="size-4 text-muted-foreground" />
                  Already using {SITE.name}?
                </CardTitle>
                <CardDescription>
                  <Link
                    className="font-medium text-foreground underline-offset-4 hover:underline"
                    to="/login"
                  >
                    Sign in to your workspace
                  </Link>
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </main>
      <LandingFooter />
    </div>
  )
}
