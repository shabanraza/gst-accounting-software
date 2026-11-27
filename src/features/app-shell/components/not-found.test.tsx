// @vitest-environment jsdom
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  notFound,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'

import { NotFound } from '#/features/app-shell/components/not-found.tsx'

function renderAt(path: string) {
  const rootRoute = createRootRoute({ component: () => <Outlet /> })
  const appRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/app',
    component: () => (
      <div data-testid="app-shell">
        <Outlet />
      </div>
    ),
  })
  const itemsRoute = createRoute({
    getParentRoute: () => appRoute,
    path: '/items',
    component: () => null,
  })
  const guideRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/help/$slug',
    loader: () => {
      throw notFound()
    },
    component: () => null,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([
      appRoute.addChildren([itemsRoute]),
      guideRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
    defaultNotFoundComponent: NotFound,
  })
  render(<RouterProvider router={router} />)
}

const href = (name: RegExp) =>
  screen.getByRole('link', { name }).getAttribute('href')

describe('NotFound', () => {
  afterEach(cleanup)

  test('an unknown public address offers home and the guides', async () => {
    renderAt('/nothing-here')

    expect(await screen.findByText('Page not found')).toBeTruthy()
    expect(href(/home/i)).toBe('/')
    expect(href(/guides/i)).toBe('/help')
  })

  test('a missing page inside the app keeps the app and goes to the dashboard', async () => {
    renderAt('/app/nothing-here')

    expect(await screen.findByText('Page not found')).toBeTruthy()
    expect(screen.getByTestId('app-shell').textContent).toContain(
      'Page not found',
    )
    expect(href(/dashboard/i)).toBe('/app/dashboard')
    expect(screen.queryByRole('link', { name: /home/i })).toBeNull()
  })

  test('is also shown when a page reports that its record is missing', async () => {
    renderAt('/help/no-such-guide')

    expect(await screen.findByText('Page not found')).toBeTruthy()
  })
})
