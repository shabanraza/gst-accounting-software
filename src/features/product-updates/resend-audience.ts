import type { ProductUpdatesAudience } from '#/features/product-updates/product-updates-service.ts'

const RESEND_API = 'https://api.resend.com'

/**
 * Resend contacts are global and carry one `unsubscribed` flag that the
 * broadcast unsubscribe link sets. `audienceId` is the Resend segment (formerly
 * "audience") that release broadcasts target. Returns null when not configured.
 */
export function createResendAudience(config: {
  apiKey: string | undefined
  audienceId: string | undefined
  fetch?: typeof fetch
}): ProductUpdatesAudience | null {
  const { apiKey, audienceId } = config
  if (!apiKey || !audienceId) return null
  const doFetch = config.fetch ?? fetch

  async function request(method: string, path: string, body?: unknown) {
    const response = await doFetch(`${RESEND_API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(
        `Resend ${method} ${path.split('/')[1]} failed (${response.status})`,
      )
    }
    return response
  }

  const contactPath = (email: string) =>
    `/contacts/${encodeURIComponent(email)}`

  return {
    async subscribe({ email, name }) {
      const updated = await request('PATCH', contactPath(email), {
        unsubscribed: false,
      })
      if (updated.status === 404) {
        await request('POST', '/contacts', {
          email,
          first_name: name,
          unsubscribed: false,
          segments: [{ id: audienceId }],
        })
        return
      }
      await request('POST', `${contactPath(email)}/segments/${audienceId}`)
    },

    async unsubscribe(email) {
      await request('PATCH', contactPath(email), { unsubscribed: true })
    },

    async isSubscribed(email) {
      const response = await request('GET', contactPath(email))
      if (response.status === 404) return false
      const contact = (await response.json()) as { unsubscribed?: boolean }
      return contact.unsubscribed !== true
    },
  }
}
