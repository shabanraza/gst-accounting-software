import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { FilePlusIcon, TruckIcon, BanknoteIcon } from 'lucide-react'

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '#/components/ui/command.tsx'
import { appNav, filterAppNav } from '#/features/app-shell/data/app-shell-nav.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { AppNavItem } from '#/features/app-shell/data/app-shell-nav.ts'
import type { Capability } from '#/features/companies/membership-service.ts'

function flattenNavItems(capabilities: Array<Capability>) {
  return filterAppNav(appNav, capabilities).flatMap((section) =>
    section.kind === 'link'
      ? [{ label: section.label, path: section.path, icon: section.icon }]
      : section.items,
  )
}

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const trpc = useTRPC()
  const { companyId, isReady, capabilities } = useWorkspace()
  const navItems = React.useMemo(
    () => flattenNavItems(capabilities),
    [capabilities],
  )

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onOpenChange, open])

  const partiesQuery = useQuery({
    ...trpc.parties.list.queryOptions({
      companyId: companyId!,
    }),
    enabled: Boolean(companyId) && isReady,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId!,
    }),
    enabled: Boolean(companyId) && isReady,
  })

  const parties = partiesQuery.data ?? []
  const items = itemsQuery.data ?? []

  function go(
    to: AppNavItem['path'] | '/app/sales/new' | '/app/purchases/new',
  ) {
    onOpenChange(false)
    void navigate({ to })
  }

  return (
    <CommandDialog onOpenChange={onOpenChange} open={open}>
      <CommandInput placeholder="Search actions, pages, parties, items…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Quick create">
          <CommandItem
            onSelect={() => go('/app/sales/new')}
            value="new sales bill invoice"
          >
            <FilePlusIcon />
            New sales bill
          </CommandItem>
          <CommandItem
            onSelect={() => go('/app/purchases/new')}
            value="new purchase bill"
          >
            <TruckIcon />
            New purchase bill
          </CommandItem>
          <CommandItem
            onSelect={() => go('/app/payments')}
            value="record payment receipt"
          >
            <BanknoteIcon />
            Record payment
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Go to">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <CommandItem
                key={item.path}
                onSelect={() => go(item.path)}
                value={`nav ${item.label}`}
              >
                <Icon />
                {item.label}
              </CommandItem>
            )
          })}
        </CommandGroup>
        {parties.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Customers & suppliers">
              {parties.slice(0, 8).map((party) => (
                <CommandItem
                  key={party.id}
                  onSelect={() => go('/app/masters/parties')}
                  value={`party ${party.name}`}
                >
                  {party.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
        {items.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Items">
              {items.slice(0, 8).map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => go('/app/masters/items')}
                  value={`item ${item.name}`}
                >
                  {item.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  )
}
