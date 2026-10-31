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

import { AlternativePage } from '#/features/marketing/components/alternative-page.tsx'
import { ALTERNATIVES, ALTERNATIVE_SLUGS } from '#/features/marketing/alternatives-content.ts'

vi.mock('#/integrations/trpc/react.ts', () => import('./marketing-trpc.mock.ts'))

vi.mock('#/lib/auth-client.ts', () => ({
  authClient: {
    getSession: vi.fn(async () => ({ data: null })),
  },
}))

function renderAlternative(slug: (typeof ALTERNATIVE_SLUGS)[number]) {
  const rootRoute = createRootRoute()
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  })
  const alternativeRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/alternatives/$competitor',
    component: () => <AlternativePage slug={slug} />,
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

  const router = createRouter({
    routeTree: rootRoute.addChildren([
      indexRoute,
      alternativeRoute,
      signupRoute,
      loginRoute,
      privacyRoute,
      dataDeletionRoute,
    ]),
    history: createMemoryHistory({ initialEntries: [`/alternatives/${slug}`] }),
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

describe('AlternativePage', () => {
  test.each(ALTERNATIVE_SLUGS)('renders a distinct headline for %s', async (slug) => {
    renderAlternative(slug)

    const alternative = ALTERNATIVES[slug]
    expect(
      await screen.findByRole('heading', { level: 1, name: alternative.headline }),
    ).toBeTruthy()

    const startLinks = screen.getAllByRole('link', { name: /start free/i })
    expect(startLinks[0]?.getAttribute('href')).toBe('/signup')

    for (const item of alternative.faq) {
      expect(screen.getByText(item.question)).toBeTruthy()
    }
  })
})
