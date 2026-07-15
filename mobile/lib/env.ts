import { isExpoWeb } from './platform.ts'

export const WORKSPACE_COMPANY_KEY = 'accounting.activeCompanyId'

const DEFAULT_API_URL = 'http://localhost:3000'

export function resolveApiBaseUrl() {
  if (isExpoWeb()) {
    return DEFAULT_API_URL
  }

  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  return DEFAULT_API_URL
}

export function getApiReachabilityHint() {
  if (isExpoWeb()) {
    return 'Start the API from the repo root with "bun run dev".'
  }

  return 'Start the API with "bun run dev:lan" and set EXPO_PUBLIC_API_URL in mobile/.env to your computer\'s LAN IP.'
}

export function resolveTrpcUrl() {
  return `${resolveApiBaseUrl()}/api/trpc`
}

export function resolveAuthBaseUrl() {
  return resolveApiBaseUrl()
}
