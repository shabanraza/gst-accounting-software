import type { ReactNode } from 'react'

export function WorkspacePage({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        data-ui="chrome"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h1>{title}</h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-col gap-4" data-ui="data">
        {children}
      </div>
    </div>
  )
}
