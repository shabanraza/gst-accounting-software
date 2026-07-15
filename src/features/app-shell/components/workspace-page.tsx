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
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-x-hidden p-3 sm:gap-4 sm:p-4">
      <div
        className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
        data-ui="chrome"
      >
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex w-full min-w-0 shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
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
