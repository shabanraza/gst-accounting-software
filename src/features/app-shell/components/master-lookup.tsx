import * as React from 'react'
import { ChevronsUpDownIcon, PlusIcon } from 'lucide-react'

import { Button } from '#/components/ui/button.tsx'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '#/components/ui/command.tsx'
import { cn } from '#/lib/utils.ts'

export type LookupOption = {
  value: string
  label: string
  keywords?: string
  description?: string
}

type MasterLookupProps = {
  options: Array<LookupOption>
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  searchPlaceholder?: string
  title?: string
  className?: string
  appearance?: 'default' | 'grid'
  disabled?: boolean
  onFocus?: () => void
  createAction?: {
    label: string
    onSelect: () => void
  }
}

export function MasterLookup({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  emptyText = 'No matches.',
  searchPlaceholder = 'Type to search…',
  title = 'Lookup',
  className,
  appearance = 'default',
  disabled,
  onFocus,
  createAction,
}: MasterLookupProps) {
  const [open, setOpen] = React.useState(false)
  const selected = options.find((option) => option.value === value)
  const isGrid = appearance === 'grid'

  function handleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (event.key === 'F2') {
      event.preventDefault()
      setOpen(true)
    }
  }

  return (
    <>
      <Button
        className={cn(
          'w-full justify-between font-normal',
          isGrid && 'h-9 rounded-none px-2 shadow-none',
          className,
        )}
        data-master-lookup
        data-voucher-grid-control={isGrid ? '' : undefined}
        disabled={disabled}
        onClick={() => setOpen(true)}
        onFocus={onFocus}
        onKeyDown={handleKeyDown}
        type="button"
        variant={isGrid ? 'ghost' : 'outline'}
      >
        <span
          className={cn('truncate', !selected && 'text-muted-foreground')}
        >
          {selected?.label ?? placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
          <kbd className="rounded border px-1 font-mono text-[10px]">F2</kbd>
          <ChevronsUpDownIcon className="size-3.5 opacity-50" />
        </span>
      </Button>
      <CommandDialog
        description="Search and select a master record"
        onOpenChange={setOpen}
        open={open}
        title={title}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  data-checked={option.value === value || undefined}
                  key={option.value}
                  keywords={
                    option.keywords
                      ? option.keywords.split(/\s+/).filter(Boolean)
                      : undefined
                  }
                  onSelect={() => {
                    onValueChange(option.value)
                    setOpen(false)
                  }}
                  value={`${option.label} ${option.keywords ?? ''}`}
                >
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{option.label}</span>
                    {option.description ? (
                      <span className="truncate text-[11px] text-muted-foreground">
                        {option.description}
                      </span>
                    ) : null}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
            {createAction ? (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false)
                      createAction.onSelect()
                    }}
                    value={`__create__ ${createAction.label}`}
                  >
                    <PlusIcon className="text-muted-foreground" />
                    <span>{createAction.label}</span>
                  </CommandItem>
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  )
}
