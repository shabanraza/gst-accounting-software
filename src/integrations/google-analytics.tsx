import { useRouterState } from '@tanstack/react-router'
import * as React from 'react'

import { env } from '#/env.ts'

/**
 * Google Analytics 4 measurement ID. Blank by default so a fresh clone and
 * local dev ship with zero analytics script — build-time var like
 * VITE_ENABLE_GOOGLE_AUTH, so it must be set for `bun run build`/deploy.
 */
export const GA_MEASUREMENT_ID = env.VITE_GA_MEASUREMENT_ID

declare global {
  interface Window {
    dataLayer?: Array<unknown>
    gtag?: (...args: Array<unknown>) => void
  }
}

/**
 * Builds the head scripts that load gtag.js and initialise it with automatic
 * page_view tracking disabled — TanStack Router is a client-side router, so
 * page views are sent manually on route change by `GoogleAnalyticsPageview`.
 */
export function buildGoogleAnalyticsScripts() {
  if (!GA_MEASUREMENT_ID) return []

  return [
    {
      src: `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`,
      async: true,
    },
    {
      children: `window.dataLayer=window.dataLayer||[];function gtag(){window.dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_MEASUREMENT_ID}',{send_page_view:false});`,
    },
  ]
}

/** Public invoice links (`/i/<token>`) are bearer links; keep them out of GA. */
const PUBLIC_INVOICE_PATH = /^\/i\/[^/]+/

/** Fires a GA4 page_view on every route change, including the first render. */
export function GoogleAnalyticsPageview() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  React.useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== 'function') return

    const isPublicInvoice = PUBLIC_INVOICE_PATH.test(pathname)
    const pagePath = isPublicInvoice ? '/i/[token]' : pathname
    window.gtag('event', 'page_view', {
      page_path: pagePath,
      page_title: isPublicInvoice ? 'Invoice' : document.title,
      page_location: isPublicInvoice
        ? `${window.location.origin}${pagePath}`
        : window.location.href,
    })
  }, [pathname])

  return null
}
