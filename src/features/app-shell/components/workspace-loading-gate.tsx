import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Skeleton } from '#/components/ui/skeleton.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
import { sessionGateAction } from '#/features/app-shell/session-gate.ts'
import { authClient } from '#/lib/auth-client.ts'

function WorkspacePageSkeleton() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 p-4">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export function WorkspaceLoadingGate({
  children,
}: {
  children: React.ReactNode
}) {
  const navigate = useNavigate()
  const {
    data: session,
    isPending: isSessionPending,
    error: sessionError,
    refetch,
  } = authClient.useSession()
  const { accountId, isLoading, error, company } = useWorkspace()
  const [retries, setRetries] = React.useState(0)
  const action = sessionGateAction({
    isPending: isSessionPending,
    hasUser: Boolean(session?.user.id),
    error: sessionError,
  })

  React.useEffect(() => {
    if (action === 'login') {
      void navigate({ to: '/login' })
    }
    if (action === 'ready') {
      setRetries(0)
    }
    if (action !== 'retry') return
    const delay = Math.min(2000 * 2 ** retries, 15_000)
    const timer = window.setTimeout(() => {
      setRetries((count) => count + 1)
      void refetch()
    }, delay)
    return () => window.clearTimeout(timer)
  }, [action, navigate, refetch, retries])

  if (action !== 'ready' || !accountId) {
    return <WorkspacePageSkeleton />
  }

  if (error && !company) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-2 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!company && isLoading) {
    return <WorkspacePageSkeleton />
  }

  return children
}
