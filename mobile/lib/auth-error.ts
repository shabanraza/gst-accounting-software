import { resolveApiBaseUrl } from './env.ts'

export function formatAuthNetworkError(error: unknown) {
  const apiUrl = resolveApiBaseUrl()
  const message = error instanceof Error ? error.message : String(error)
  const isNetworkFailure =
    message === 'Failed to fetch' ||
    message.includes('Network request failed') ||
    message.includes('NetworkError')

  if (!isNetworkFailure) {
    return message || 'Unable to reach the API.'
  }

  return `Cannot reach the API at ${apiUrl}. Start the web server from the repo root with "bun run dev:lan", then set EXPO_PUBLIC_API_URL in mobile/.env to your computer's LAN IP (for Expo Go on a phone).`
}
