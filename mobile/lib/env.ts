export const WORKSPACE_COMPANY_KEY = 'accounting.activeCompanyId'

export function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim()
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  return 'http://localhost:3000'
}

export function resolveTrpcUrl() {
  return `${resolveApiBaseUrl()}/api/trpc`
}

export function resolveAuthBaseUrl() {
  return resolveApiBaseUrl()
}
