import { isAndroidEmulator, isExpoWeb } from './platform.ts'

export const WORKSPACE_COMPANY_KEY = 'accounting.activeCompanyId'

const DEFAULT_API_URL = 'http://localhost:3000'
const ANDROID_EMULATOR_API_URL = 'http://10.0.2.2:3000'

function rewriteLocalhostForAndroidEmulator(url: string) {
  if (!isAndroidEmulator()) {
    return url
  }

  return url
    .replace('://localhost', '://10.0.2.2')
    .replace('://127.0.0.1', '://10.0.2.2')
}

export function resolveApiBaseUrl() {
  if (isExpoWeb()) {
    return DEFAULT_API_URL
  }

  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) {
    return rewriteLocalhostForAndroidEmulator(configured.replace(/\/$/, ''))
  }

  if (isAndroidEmulator()) {
    return ANDROID_EMULATOR_API_URL
  }

  return DEFAULT_API_URL
}

export function getApiReachabilityHint() {
  if (isExpoWeb()) {
    return 'Start the API from the repo root with "bun run dev".'
  }

  if (isAndroidEmulator()) {
    return 'Start the API with "bun run dev:lan" from the repo root. On the Android emulator use EXPO_PUBLIC_API_URL=http://10.0.2.2:3000 (or leave it unset).'
  }

  return 'Start the API with "bun run dev:lan" and set EXPO_PUBLIC_API_URL in mobile/.env to your computer\'s LAN IP.'
}

export function resolveTrpcUrl() {
  return `${resolveApiBaseUrl()}/api/trpc`
}

export function resolveAuthBaseUrl() {
  return resolveApiBaseUrl()
}
