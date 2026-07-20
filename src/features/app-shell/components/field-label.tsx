import type * as React from 'react'

import { cn } from '#/lib/utils.ts'

export function FieldLabel({
  children,
  className,
  htmlFor,
}: {
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  if (htmlFor) {
    return (
      <label
        className={cn('text-xs text-muted-foreground', className)}
        htmlFor={htmlFor}
      >
        {children}
      </label>
    )
  }

  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      {children}
    </span>
  )
}

export function FieldGroup({
  label,
  children,
  className,
  htmlFor,
}: {
  label: string
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
    </div>
  )
}
