const MAX_ERRORS = 5
const MAX_ENTRY_LENGTH = 1500
const STACK_FRAMES = 3

let errors: Array<string> = []

function describeError(error: unknown) {
  if (!(error instanceof Error)) return String(error)
  const header = `${error.name}: ${error.message}`
  // Chrome stacks repeat the header and indent frames with "at "; Safari and
  // Firefox list bare "fn@url:line:col" frames.
  const frames = (error.stack ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !header.startsWith(line))
    .slice(0, STACK_FRAMES)
  return [header, ...frames].join('\n')
}

/**
 * Remembers the last few errors the app hit in this tab, so a problem report
 * can say what actually broke. Kept in memory only, never sent on its own.
 */
export function recordClientError(error: unknown) {
  const entry = describeError(error).slice(0, MAX_ENTRY_LENGTH)
  const header = entry.split('\n')[0]
  // A render error often repeats on every retry; keep only its latest copy.
  errors = [
    ...errors.filter((existing) => existing.split('\n')[0] !== header),
    entry,
  ].slice(-MAX_ERRORS)
}

export function recentClientErrors() {
  return [...errors]
}

export function clearClientErrors() {
  errors = []
}

let installed = false

/** Records uncaught errors and unhandled promise rejections in the browser. */
export function installClientErrorCapture() {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('error', (event) => {
    recordClientError(event.error ?? event.message)
  })
  window.addEventListener('unhandledrejection', (event) => {
    recordClientError(event.reason)
  })
}
