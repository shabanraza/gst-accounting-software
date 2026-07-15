import { formatAuthNetworkError } from './auth-error.ts'
import { resolveApiBaseUrl } from './env.ts'

export type ApiHealthResult =
  | { ok: true }
  | { ok: false; message: string }

export async function checkApiHealth(): Promise<ApiHealthResult> {
  const apiUrl = resolveApiBaseUrl()

  try {
    const response = await fetch(`${apiUrl}/api/auth/get-session`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (response.ok || response.status === 401) {
      return { ok: true }
    }

    return {
      ok: false,
      message: `API at ${apiUrl} responded with status ${response.status}.`,
    }
  } catch (error) {
    return {
      ok: false,
      message: formatAuthNetworkError(error),
    }
  }
}
