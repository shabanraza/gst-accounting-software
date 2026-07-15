import { checkApiHealth, type ApiHealthResult } from './api-health.ts'
import { getApiReachabilityHint } from './env.ts'

export const API_HEALTH_CHECK_TIMEOUT_MS = 10_000

export function buildApiHealthTimeoutMessage(timeoutMs: number): string {
  return `API health check timed out after ${timeoutMs / 1000}s. ${getApiReachabilityHint()}`
}

export async function checkApiHealthWithTimeout(
  timeoutMs = API_HEALTH_CHECK_TIMEOUT_MS,
): Promise<ApiHealthResult> {
  return Promise.race([
    checkApiHealth(),
    new Promise<ApiHealthResult>((resolve) => {
      setTimeout(
        () =>
          resolve({
            ok: false,
            message: buildApiHealthTimeoutMessage(timeoutMs),
          }),
        timeoutMs,
      )
    }),
  ])
}
