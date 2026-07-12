import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/app/sales')({
  component: SalesLayoutRoute,
})

function SalesLayoutRoute() {
  return <Outlet />
}
