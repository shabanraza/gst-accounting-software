export function RoutePending() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading page"
      className="h-0.5 w-full animate-pulse bg-primary/40"
      role="status"
    />
  )
}
