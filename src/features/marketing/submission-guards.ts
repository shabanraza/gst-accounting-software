/** Salted SHA-256 of the client IP, so raw IPs are never stored. */
export async function hashClientIp(request: Request): Promise<string | null> {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  if (!ip) return null

  const salt = process.env.BETTER_AUTH_SECRET ?? ''
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(`${salt}:${ip}`),
  )
  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}

/**
 * Verifies a Cloudflare Turnstile token. Skipped (returns true) when
 * `TURNSTILE_SECRET_KEY` is not configured, e.g. in local dev.
 */
export async function verifyTurnstileToken(
  token: string | undefined,
  request: Request,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  if (!token) return false

  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  const ip = request.headers.get('cf-connecting-ip')
  if (ip) body.append('remoteip', ip)

  try {
    const response = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body },
    )
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch {
    return false
  }
}
