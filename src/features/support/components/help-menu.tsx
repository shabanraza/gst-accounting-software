import * as React from 'react'
import {
  BookOpenIcon,
  BugIcon,
  CircleHelpIcon,
  KeyboardIcon,
  MailIcon,
  SparklesIcon,
} from 'lucide-react'

import { Badge } from '#/components/ui/badge.tsx'
import { Button } from '#/components/ui/button.tsx'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu.tsx'
import {
  WhatsNewSheet,
  useWhatsNew,
} from '#/features/changelog/components/whats-new-sheet.tsx'
import { KeyboardShortcutsDialog } from '#/features/support/components/keyboard-shortcuts-dialog.tsx'
import { ReportProblemDialog } from '#/features/support/components/report-problem-dialog.tsx'
import { SUPPORT_EMAIL } from '#/features/support/problem-report.ts'

type HelpPanel = 'whats-new' | 'shortcuts' | 'report' | null

export function HelpMenu() {
  const [panel, setPanel] = React.useState<HelpPanel>(null)
  const { unseen, markSeen } = useWhatsNew()
  // Keep the "New" markers visible while the sheet is open, then clear them.
  const [unseenWhileOpen, setUnseenWhileOpen] = React.useState(0)

  function openWhatsNew() {
    setUnseenWhileOpen(unseen)
    markSeen()
    setPanel('whats-new')
  }

  const closePanel = (open: boolean) => {
    if (!open) setPanel(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button aria-label="Help" className="relative" size="sm" variant="outline">
            <CircleHelpIcon data-icon="inline-start" />
            <span className="hidden md:inline">Help</span>
            {unseen > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary"
              />
            ) : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href="/#faq" rel="noreferrer" target="_blank">
                <BookOpenIcon />
                Help & FAQ
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPanel('shortcuts')}>
              <KeyboardIcon />
              Keyboard shortcuts
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={openWhatsNew}>
              <SparklesIcon />
              What's new
              {unseen > 0 ? (
                <Badge className="ml-auto" variant="info">
                  {unseen}
                </Badge>
              ) : null}
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <a href={`mailto:${SUPPORT_EMAIL}`}>
                <MailIcon />
                Contact support
              </a>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setPanel('report')}>
              <BugIcon />
              Report a problem
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
      <WhatsNewSheet
        onOpenChange={closePanel}
        open={panel === 'whats-new'}
        unseen={unseenWhileOpen}
      />
      <KeyboardShortcutsDialog
        onOpenChange={closePanel}
        open={panel === 'shortcuts'}
      />
      <ReportProblemDialog onOpenChange={closePanel} open={panel === 'report'} />
    </>
  )
}
