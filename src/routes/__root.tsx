import * as React from 'react'
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import {
  PostHogErrorBoundary,
  PostHogProvider,
  usePostHog,
} from '@posthog/react'
import { AppDevtools } from '../integrations/tanstack-devtools'
import {
  GoogleAnalyticsPageview,
  buildGoogleAnalyticsScripts,
} from '../integrations/google-analytics.tsx'
import { Toaster } from '#/components/ui/sonner.tsx'
import { TooltipProvider } from '#/components/ui/tooltip.tsx'
import { authClient } from '#/lib/auth-client.ts'
import { env } from '#/env.ts'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

import type { TRPCRouter } from '#/integrations/trpc/router'
import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'

interface MyRouterContext {
  queryClient: QueryClient

  trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'HisaabKro',
      },
      {
        name: 'theme-color',
        content: '#2A2722',
      },
      ...(env.VITE_GOOGLE_SITE_VERIFICATION
        ? [
            {
              name: 'google-site-verification',
              content: env.VITE_GOOGLE_SITE_VERIFICATION,
            },
          ]
        : []),
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      { rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'manifest', href: '/manifest.json' },
    ],
    scripts: buildGoogleAnalyticsScripts(),
  }),
  shellComponent: RootDocument,
})

const posthogApiKey = env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
const posthogHost = env.VITE_PUBLIC_POSTHOG_HOST

function PostHogIdentity() {
  const posthog = usePostHog()
  const { data: session, isPending } = authClient.useSession()
  const identifiedUserId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (isPending) return

    const user = session?.user
    if (!user) {
      if (identifiedUserId.current) {
        posthog.reset()
        identifiedUserId.current = null
      }
      return
    }

    if (identifiedUserId.current === user.id) return

    if (identifiedUserId.current) {
      posthog.reset()
    }

    posthog.identify(user.id, {
      email: user.email,
      name: user.name,
    })
    identifiedUserId.current = user.id
  }, [isPending, posthog, session?.user])

  return null
}

function PostHogRoot({ children }: { children: React.ReactNode }) {
  if (!posthogApiKey || !posthogHost) {
    if (import.meta.env.DEV) {
      const missingVariable = !posthogApiKey
        ? 'VITE_PUBLIC_POSTHOG_PROJECT_TOKEN'
        : 'VITE_PUBLIC_POSTHOG_HOST'
      throw new Error(
        `${missingVariable} variable required by PostHog is missing or un-configured, this causes events to be silently missed. This error stops appearing once ${missingVariable} is configured`,
      )
    }

    return <>{children}</>
  }

  return (
    <PostHogProvider
      apiKey={posthogApiKey}
      options={{
        api_host: posthogHost,
        defaults: '2025-05-24',
        capture_exceptions: true,
        debug: import.meta.env.DEV,
        logs: {
          serviceName: 'hisaabkro-web',
          environment: import.meta.env.MODE,
        },
        tracing_headers:
          typeof window !== 'undefined' ? [window.location.hostname] : [],
      }}
    >
      <PostHogIdentity />
      <PostHogErrorBoundary>{children}</PostHogErrorBoundary>
    </PostHogProvider>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <PostHogRoot>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster closeButton position="top-center" />
          <AppDevtools />
          <GoogleAnalyticsPageview />
        </PostHogRoot>
        <Scripts />
      </body>
    </html>
  )
}
