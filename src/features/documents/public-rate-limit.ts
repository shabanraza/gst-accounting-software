/**
 * Per-key fixed-window limiter for unauthenticated reads. State lives in the
 * Worker isolate, so it is a best-effort brake on scraping, not a global
 * quota; the real protection for public links is the signed token.
 */
export function createFixedWindowRateLimiter(options: {
  limit: number
  windowMs: number
  maxKeys?: number
  now?: () => number
}) {
  const maxKeys = options.maxKeys ?? 10_000
  const now = options.now ?? (() => Date.now())
  const windows = new Map<string, { count: number; resetAt: number }>()

  function prune(at: number) {
    for (const [key, window] of windows) {
      if (window.resetAt <= at) windows.delete(key)
    }
    if (windows.size >= maxKeys) windows.clear()
  }

  return {
    /** Records one request for `key`; false once the key is over its limit. */
    take(key: string): boolean {
      const at = now()
      const current = windows.get(key)
      if (!current || current.resetAt <= at) {
        if (!current && windows.size >= maxKeys) prune(at)
        windows.set(key, { count: 1, resetAt: at + options.windowMs })
        return true
      }
      current.count += 1
      return current.count <= options.limit
    },
    size: () => windows.size,
  }
}
