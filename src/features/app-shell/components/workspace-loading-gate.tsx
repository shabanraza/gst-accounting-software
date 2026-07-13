import { Skeleton } from '#/components/ui/skeleton.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'

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
  const { accountId, isLoading, error, company } = useWorkspace()

  if (!accountId) {
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
