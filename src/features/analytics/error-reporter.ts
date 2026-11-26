type Capture = (error: unknown) => void

/** Errors kept while monitoring loads, or dropped when it is not configured. */
const MAX_WAITING = 10

/** Takes errors at any time, so the monitoring library can load later. */
export function createErrorReporter() {
  let capture: Capture | null = null
  let waiting: Array<unknown> = []

  return {
    report(error: unknown) {
      if (capture) capture(error)
      else if (waiting.length < MAX_WAITING) waiting.push(error)
    },
    start(load: () => Promise<Capture>) {
      return load().then(
        (loaded) => {
          capture = loaded
          for (const error of waiting) loaded(error)
          waiting = []
        },
        // Blocked or offline: the app works the same without monitoring.
        () => undefined,
      )
    },
  }
}

export const errorReporter = createErrorReporter()
