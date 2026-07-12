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
import { appNavItems } from '#/features/app-shell/data/app-shell-nav.ts'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { useTRPC } from '#/integrations/trpc/react.ts'

import type { AppNavItem } from '#/features/app-shell/data/app-shell-nav.ts'

const navItems: Array<AppNavItem> = appNavItems

type CommandPaletteProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate()
  const trpc = useTRPC()
  const { companyId, isReady } = useWorkspace()

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
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && open,
  })
  const itemsQuery = useQuery({
    ...trpc.inventory.listItems.queryOptions({
      companyId: companyId ?? '00000000-0000-4000-8000-000000000099',
    }),
    enabled: Boolean(companyId) && isReady && open,
  })

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
        {partiesQuery.data && partiesQuery.data.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Parties">
              {partiesQuery.data.slice(0, 8).map((party) => (
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
        {itemsQuery.data && itemsQuery.data.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Items">
              {itemsQuery.data.slice(0, 8).map((item) => (
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
