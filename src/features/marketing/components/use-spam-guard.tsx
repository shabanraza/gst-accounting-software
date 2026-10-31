import * as React from 'react'

import { env } from '#/env.ts'

type TurnstileApi = {
  render: (
    element: HTMLElement,
    options: {
      sitekey: string
      appearance?: 'always' | 'execute' | 'interaction-only'
      callback: (token: string) => void
      'expired-callback': () => void
    },
  ) => string
  reset: (widgetId: string) => void
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

const TURNSTILE_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let turnstileScript: Promise<void> | null = null

function loadTurnstile(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  turnstileScript ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TURNSTILE_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Turnstile failed to load'))
    document.head.append(script)
  })
  return turnstileScript
}

/**
 * Spam protection shared by every public form: a hidden honeypot input plus
 * a Cloudflare Turnstile widget (only when `VITE_TURNSTILE_SITE_KEY` is set).
 * Render `fields` inside the form and spread `payload()` into the mutation.
 */
export function useSpamGuard() {
  const siteKey = env.VITE_TURNSTILE_SITE_KEY
  const [website, setWebsite] = React.useState('')
  const [token, setToken] = React.useState('')
  const containerRef = React.useRef<HTMLDivElement>(null)
  const widgetId = React.useRef<string | null>(null)

  React.useEffect(() => {
    if (!siteKey || !containerRef.current) return
    let cancelled = false
    const element = containerRef.current

    loadTurnstile()
      .then(() => {
        if (cancelled || !window.turnstile) return
        widgetId.current = window.turnstile.render(element, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          callback: setToken,
          'expired-callback': () => setToken(''),
        })
      })
      .catch(() => {})

    return () => {
      cancelled = true
      if (widgetId.current) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
    }
  }, [siteKey])

  const fields = (
    <>
      <input
        aria-hidden="true"
        autoComplete="off"
        className="hidden"
        name="website"
        onChange={(event) => setWebsite(event.target.value)}
        tabIndex={-1}
        value={website}
      />
      {siteKey ? <div ref={containerRef} /> : null}
    </>
  )

  return {
    fields,
    payload: () => ({
      website: website || undefined,
      turnstileToken: token || undefined,
      sourcePath: window.location.pathname,
    }),
    reset: () => {
      setToken('')
      if (widgetId.current) window.turnstile?.reset(widgetId.current)
    },
  }
}
