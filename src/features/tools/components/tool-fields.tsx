import type * as React from 'react'

import { Label } from '#/components/ui/label.tsx'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select.tsx'
import { GST_STATE_NAMES } from '#/features/documents/gst-invoice-format.ts'
import { cn } from '#/lib/utils.ts'

export const STATE_OPTIONS = Object.entries(GST_STATE_NAMES)
  .filter(([code]) => code !== '28' && code !== '99')
  .map(([code, name]) => ({ code, name }))
  .sort((a, b) => a.name.localeCompare(b.name))

export function Field({
  id,
  label,
  children,
  className,
}: {
  id: string
  label: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  )
}

export function StateSelect({
  id,
  value,
  onChange,
}: {
  id: string
  value: string
  onChange: (code: string) => void
}) {
  return (
    <Select onValueChange={onChange} value={value}>
      <SelectTrigger className="w-full" id={id}>
        <SelectValue placeholder="Select state" />
      </SelectTrigger>
      <SelectContent>
        {STATE_OPTIONS.map((state) => (
          <SelectItem key={state.code} value={state.code}>
            {state.code} – {state.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** One labelled figure in a result panel; numbers use the mono face. */
export function ResultRow({
  label,
  value,
  emphasis = false,
}: {
  label: string
  value: string
  emphasis?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          'font-mono text-sm tabular-nums text-foreground',
          emphasis && 'text-base font-semibold',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
