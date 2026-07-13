import { Skeleton } from '#/components/ui/skeleton.tsx'
import { useWorkspace } from '#/features/app-shell/workspace-context.tsx'

export function WorkspaceLoadingGate({
  children,
}: {
  children: React.ReactNode
}) {
  const { accountId, isLoading, error, company } = useWorkspace()

  if (!accountId) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3 pt-0">
        <div className="flex flex-col gap-2 border-b pb-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error && !company) {
    return (
      <div className="flex flex-1 flex-col gap-2 p-3 pt-0 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!company && isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-3 pt-0">
        <div className="flex flex-col gap-2 border-b pb-3">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return children
}
