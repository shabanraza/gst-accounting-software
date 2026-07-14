import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/design/accounting')({
  beforeLoad: ({ location }) => {
    if (
      location.pathname === '/design/accounting' ||
      location.pathname === '/design/accounting/'
    ) {
      throw redirect({
        to: '/app/dashboard',
      })
    }
  },
  component: Outlet,
})
