const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i

declare global {
  interface ImportMeta {
    readonly env: {
      readonly DEV: boolean
    }
  }
}

function normalizeOrigin(url: string) {
  return url.trim().replace(/\/$/, '')
}

function isLocalhostUrl(url: string) {
  return LOCALHOST_PATTERN.test(normalizeOrigin(url))
}

function localDevBaseUrl() {
  const configured = process.env.BETTER_AUTH_URL?.trim()
  if (configured && isLocalhostUrl(configured)) {
    return normalizeOrigin(configured)
  }

  return `http://localhost:${process.env.PORT ?? 3000}`
}

function productionBaseUrl() {
  const configured =
    process.env.BETTER_AUTH_URL?.trim() || process.env.SERVER_URL?.trim()

  if (!configured) {
    throw new Error(
      'BETTER_AUTH_URL must be set in production (e.g. https://hisaabkro.in)',
    )
  }

  if (isLocalhostUrl(configured)) {
    throw new Error(
      'BETTER_AUTH_URL cannot be localhost in production. Set your production app URL in Cloudflare secrets.',
    )
  }

  return normalizeOrigin(configured)
}

/** Origin used for server-side fetches (tRPC SSR, invite links). */
export function getServerBaseUrl() {
  if (typeof window !== 'undefined') {
    return ''
  }

  if (import.meta.env.DEV) {
    return localDevBaseUrl()
  }

  return productionBaseUrl()
}

export function getTrpcUrl() {
  return `${getServerBaseUrl()}/api/trpc`
}
