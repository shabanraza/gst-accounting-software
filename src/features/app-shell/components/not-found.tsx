import { Link, useRouterState } from '@tanstack/react-router'
import {
  BookOpenIcon,
  FileQuestionIcon,
  HouseIcon,
  LayoutDashboardIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Empty,
  EmptyContent,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '#/components/ui/empty.tsx'

/**
 * Shown for an unknown address, or a public page (guide, tool, comparison) that
 * does not exist. Inside the app it sits within the app shell; elsewhere it
 * fills the screen.
 */
export function NotFound() {
  const inApp = useRouterState({
    select: (state) => state.location.pathname.startsWith('/app/'),
  })

  return (
    <div
      className={
        inApp
          ? 'flex min-h-0 flex-1 flex-col p-4'
          : 'flex min-h-svh flex-col p-4'
      }
    >
      <Empty className="py-10 sm:py-16" data-hero-surface="" data-ui="chrome">
        <EmptyHeader>
          <EmptyMedia
            className="icon-duotone size-12 rounded-full"
            variant="icon"
          >
            <FileQuestionIcon className="size-6" />
          </EmptyMedia>
          <EmptyTitle className="text-lg">
            <h1>Page not found</h1>
          </EmptyTitle>
        </EmptyHeader>
        <EmptyContent className="flex-row flex-wrap justify-center gap-2">
          {inApp ? (
            <Button asChild>
              <Link to="/app/dashboard">
                <LayoutDashboardIcon data-icon="inline-start" />
                Back to dashboard
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild>
                <Link to="/">
                  <HouseIcon data-icon="inline-start" />
                  Go to home
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/help">
                  <BookOpenIcon data-icon="inline-start" />
                  Guides
                </Link>
              </Button>
            </>
          )}
        </EmptyContent>
      </Empty>
    </div>
  )
}
