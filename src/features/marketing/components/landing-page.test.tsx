// @vitest-environment jsdom
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, test, vi } from 'vitest'

import { LandingPage } from '#/features/marketing/components/landing-page.tsx'
import {
  CONTACT,
  FEEDBACK,
  HERO,
  SITE,
  WAITLIST,
} from '#/features/marketing/landing-content.ts'

vi.mock('#/integrations/trpc/react.ts', () => import('./marketing-trpc.mock.ts'))

vi.mock('#/lib/auth-client.ts', () => ({
  authClient: {
    getSession: vi.fn(async () => ({ data: null })),
  },
}))

function renderLanding() {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: LandingPage,
  })
  const signupRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/signup',
    component: () => null,
  })
  const loginRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/login',
    component: () => null,
  })
  const privacyRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/privacy',
    component: () => null,
  })
  const dataDeletionRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/data-deletion',
    component: () => null,
  })
  const contactRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/contact',
    component: () => null,
  })
  const dashboardRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/app/dashboard',
    component: () => null,
  })

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      signupRoute,
      loginRoute,
      privacyRoute,
      dataDeletionRoute,
      contactRoute,
      dashboardRoute,
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })

  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  cleanup()
})

describe('LandingPage', () => {
  test('renders headline and primary conversion links', async () => {
    renderLanding()

    expect(
      await screen.findByRole('heading', { level: 1, name: HERO.headline }),
    ).toBeTruthy()

    const startLinks = screen.getAllByRole('link', { name: /start free/i })
    expect(startLinks.length).toBeGreaterThan(0)
    expect(startLinks[0]?.getAttribute('href')).toBe('/signup')

    expect(
      screen.getByRole('heading', { level: 2, name: CONTACT.title }),
    ).toBeTruthy()
    expect(
      screen.getByRole('heading', { level: 2, name: FEEDBACK.title }),
    ).toBeTruthy()
    expect(
      screen.getByRole('textbox', { name: WAITLIST.label }),
    ).toBeTruthy()

    const githubLinks = screen.getAllByRole('link', { name: /github/i })
    expect(
      githubLinks.some(
        (link) => link.getAttribute('href') === SITE.githubUrl,
      ),
    ).toBe(true)
  })
})
