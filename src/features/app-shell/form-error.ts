/** Extract a readable message from tRPC / Zod / Error failures. */
export function getFormErrorMessage(error: unknown, fallback = 'Save failed') {
  if (!(error instanceof Error)) {
    return fallback
  }

  const message = error.message.trim()
  if (!message) {
    return fallback
  }

  if (message.startsWith('[')) {
    try {
      const parsed = JSON.parse(message) as Array<{
        message?: string
        path?: Array<string | number>
      }>
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .map((issue) => {
            const path =
              issue.path && issue.path.length > 0
                ? `${issue.path.join('.')}: `
                : ''
            return `${path}${issue.message ?? 'Invalid value'}`
          })
          .join('; ')
      }
    } catch {
      // fall through
    }
  }

  return message
}
