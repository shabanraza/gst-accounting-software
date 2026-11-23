import * as React from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, ChevronRightIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import { HelpSteps } from '#/features/marketing/components/help-steps.tsx'
import { HELP_GUIDES, HELP_HUB, helpGuidePath } from '#/features/marketing/help-content.ts'
import { appNavItems } from '#/features/app-shell/data/app-shell-nav.ts'

function pageLabel(path: string) {
  if (path === '/app/sales/new') return 'New sales invoice'
  if (path === '/app/purchases/new') return 'New purchase bill'
  return appNavItems.find((item) => item.path === path)?.label ?? 'Open page'
}

export function GuidesSheet({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [slug, setSlug] = React.useState<string | null>(null)
  const guide = HELP_GUIDES.find((entry) => entry.slug === slug)

  function handleOpenChange(next: boolean) {
    onOpenChange(next)
    if (!next) setSlug(null)
  }

  return (
    <Sheet onOpenChange={handleOpenChange} open={open}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{guide ? guide.title : 'Guides'}</SheetTitle>
          <SheetDescription>{guide ? guide.summary : HELP_HUB.intro}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-4">
          {guide ? (
            <div className="flex flex-col gap-5">
              <HelpSteps steps={guide.steps} />
              <Button asChild className="w-fit" variant="outline">
                <Link onClick={() => handleOpenChange(false)} to={guide.appPath}>
                  {pageLabel(guide.appPath)}
                  <ArrowRightIcon data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {HELP_GUIDES.map((entry) => (
                <li key={entry.slug}>
                  <button
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left transition-colors duration-(--duration-fast) ease-(--ease-precise) hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                    onClick={() => setSlug(entry.slug)}
                    type="button"
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium">{entry.title}</span>
                      <span className="text-xs text-muted-foreground">{entry.summary}</span>
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <SheetFooter className="flex-row flex-wrap gap-2">
          {guide ? (
            <Button onClick={() => setSlug(null)} type="button" variant="ghost">
              <ArrowLeftIcon data-icon="inline-start" />
              All guides
            </Button>
          ) : null}
          <Button asChild className="ml-auto" variant="outline">
            <a
              href={guide ? helpGuidePath(guide) : HELP_HUB.path}
              rel="noreferrer"
              target="_blank"
            >
              Open on the web
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
