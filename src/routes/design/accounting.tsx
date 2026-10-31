import { Outlet, createFileRoute, redirect } from '@tanstack/react-router'
import { noindexHead } from '#/lib/seo.ts'

export const Route = createFileRoute('/design/accounting')({
  head: noindexHead,
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
