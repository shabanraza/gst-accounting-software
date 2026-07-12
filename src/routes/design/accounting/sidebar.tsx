import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/design/accounting/sidebar')({
  beforeLoad: () => {
    throw redirect({
      to: '/app/dashboard',
    })
  },
})
