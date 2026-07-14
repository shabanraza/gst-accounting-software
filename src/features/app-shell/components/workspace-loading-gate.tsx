import * as React from 'react'
import { useNavigate } from '@tanstack/react-router'

import { Skeleton } from '#/components/ui/skeleton.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'
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
  const { data: session, isPending: isSessionPending } = authClient.useSession()
  const { accountId, isLoading, error, company } = useWorkspace()

  React.useEffect(() => {
    if (!isSessionPending && !session?.user?.id) {
      void navigate({ to: '/login' })
    }
  }, [isSessionPending, navigate, session?.user?.id])

  if (isSessionPending || !accountId) {
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
