import * as React from 'react'
import { ArrowUpRightIcon } from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import { Separator } from '#/components/ui/separator.tsx'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '#/components/ui/sheet.tsx'
import { countUnseenReleases } from '#/features/changelog/changelog.ts'
import { ReleaseNotes } from '#/features/changelog/components/release-notes.tsx'
import {
  APP_VERSION,
  RELEASES,
  formatReleaseDate,
} from '#/features/changelog/releases.ts'

const LAST_SEEN_KEY = 'hisaabkro:whats-new-last-seen'
const RECENT_RELEASES = 5

/** Unseen release count for this browser; storage failures count as nothing unseen. */
export function useWhatsNew() {
  const [lastSeen, setLastSeen] = React.useState<string | null>(APP_VERSION)

  React.useEffect(() => {
    try {
      setLastSeen(window.localStorage.getItem(LAST_SEEN_KEY))
    } catch {
      // Private mode or blocked storage: show no unseen marker.
    }
  }, [])

  const markSeen = React.useCallback(() => {
    try {
      window.localStorage.setItem(LAST_SEEN_KEY, APP_VERSION)
    } catch {
      // Nothing to persist; the marker clears for this page view only.
    }
    setLastSeen(APP_VERSION)
  }, [])

  return { unseen: countUnseenReleases(RELEASES, lastSeen), markSeen }
}

export function WhatsNewSheet({
  open,
  onOpenChange,
  unseen,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Releases to mark as new while the sheet is open. */
  unseen: number
}) {
  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>What's new</SheetTitle>
          <SheetDescription>Version {APP_VERSION}</SheetDescription>
        </SheetHeader>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-4 pb-4">
          {RELEASES.slice(0, RECENT_RELEASES).map((release, index) => (
            <section key={release.version} className="flex flex-col gap-3">
              {index > 0 ? <Separator /> : null}
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-medium">
                  {formatReleaseDate(release.date)}
                </h3>
                <span className="text-xs text-muted-foreground">
                  v{release.version}
                </span>
                {index < unseen ? (
                  <Badge variant="outline">Unread</Badge>
                ) : null}
              </div>
              <ReleaseNotes release={release} />
            </section>
          ))}
        </div>
        <SheetFooter>
          <Button asChild variant="outline">
            <a href="/changelog" rel="noreferrer" target="_blank">
              Full changelog
              <ArrowUpRightIcon data-icon="inline-end" />
            </a>
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
