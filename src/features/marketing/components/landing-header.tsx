import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { GitBranchIcon, MenuIcon, XIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import { NAV_LINKS, SITE } from '#/features/marketing/landing-content.ts'
import { authClient } from '#/lib/auth-client.ts'

export function LandingHeader() {
  const [hasSession, setHasSession] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    let cancelled = false
    void authClient.getSession().then((session) => {
      if (!cancelled) setHasSession(Boolean(session.data))
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <header
      className="sticky top-0 z-40 bg-shell-canvas/90 backdrop-blur-md"
      data-app-header=""
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <a
          className="font-heading text-base font-semibold tracking-tight text-foreground"
          href="/#top"
        >
          {SITE.name}
        </a>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-5 md:flex"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              className="text-sm text-muted-foreground transition-colors duration-(--duration-fast) ease-(--ease-precise) hover:text-foreground"
              href={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="ghost">
            <a
              href={SITE.githubUrl}
              rel="noreferrer"
              target="_blank"
            >
              <GitBranchIcon data-icon="inline-start" />
              GitHub
            </a>
          </Button>
          {hasSession ? (
            <Button asChild size="sm">
              <Link to="/app/dashboard">Open dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild className="hidden sm:inline-flex" size="sm" variant="ghost">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Start free</Link>
              </Button>
            </>
          )}
          <Button
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="md:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            size="icon-sm"
            variant="ghost"
          >
            {menuOpen ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </div>

      {menuOpen ? (
        <nav
          aria-label="Mobile"
          className="flex flex-col gap-1 border-t border-border px-4 py-3 md:hidden"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              className="rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted"
              href={link.href}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </a>
          ))}
        </nav>
      ) : null}
    </header>
  )
}
