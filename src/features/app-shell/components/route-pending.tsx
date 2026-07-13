import { Skeleton } from '#/components/ui/skeleton.tsx'

export function RoutePending() {
  return (
    <div className="flex flex-1 flex-col gap-3 p-3 pt-0">
      <div className="flex flex-col gap-2 border-b pb-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
