import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { AppDevtools } from '../integrations/tanstack-devtools'
import {
  GoogleAnalyticsPageview,
  buildGoogleAnalyticsScripts,
} from '../integrations/google-analytics.tsx'
import { Toaster } from '#/components/ui/sonner.tsx'
import { TooltipProvider } from '#/components/ui/tooltip.tsx'
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster closeButton position="top-center" richColors />
        <AppDevtools />
        <GoogleAnalyticsPageview />
        <Scripts />
      </body>
    </html>
  )
}
