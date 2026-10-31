import * as React from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import {
  BanknoteArrowDownIcon,
  BanknoteArrowUpIcon,
  FilePlusIcon,
  ShoppingCartIcon,
} from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  quickActionForKey,
  visibleQuickActions,
} from '#/features/app-shell/quick-actions.ts'
import type { QuickActionKey } from '#/features/app-shell/quick-actions.ts'
import type { Capability } from '#/features/companies/membership-service.ts'

const ICONS: Record<QuickActionKey, typeof FilePlusIcon> = {
  sale: FilePlusIcon,
  purchase: ShoppingCartIcon,
  receipt: BanknoteArrowDownIcon,
  payment: BanknoteArrowUpIcon,
}

/** Typing in a field or working in a dialog must never navigate away. */
function isBusyTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (element?.closest('input, textarea, select, [contenteditable="true"]')) {
    return true
  }
  return Boolean(document.querySelector('[role="dialog"][data-state="open"]'))
}

/** Alt+S / Alt+P / Alt+R / Alt+Y open a new sale, purchase, receipt or payment. */
export function useQuickActionShortcuts(
  capabilities: ReadonlyArray<Capability>,
) {
  const navigate = useNavigate()

  React.useEffect(() => {
    const allowed = new Set(
      visibleQuickActions(capabilities).map((action) => action.key),
    )

    function onKeyDown(event: KeyboardEvent) {
      const action = quickActionForKey(event)
      if (!action || !allowed.has(action.key) || isBusyTarget(event.target)) {
        return
      }
      event.preventDefault()
      void navigate({ to: action.to, search: action.search })
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [capabilities, navigate])
}

export function QuickActionsBar({
  capabilities,
}: {
  capabilities: ReadonlyArray<Capability>
}) {
  const actions = visibleQuickActions(capabilities)
  if (actions.length === 0) return null

  return (
    <nav
      aria-label="Quick actions"
      className="grid grid-cols-2 gap-2 sm:grid-cols-4"
    >
      {actions.map((action) => {
        const Icon = ICONS[action.key]
        return (
          <Button
            asChild
            className="justify-start"
            key={action.key}
            variant="outline"
          >
            <Link search={action.search} to={action.to}>
              <Icon data-icon="inline-start" />
              <span className="truncate">{action.label}</span>
              <kbd className="ml-auto hidden rounded border bg-muted px-1 font-mono text-[10px] text-muted-foreground sm:inline">
                {action.shortcut}
              </kbd>
            </Link>
          </Button>
        )
      })}
    </nav>
  )
}
