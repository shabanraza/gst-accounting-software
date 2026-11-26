type Properties = Record<string, unknown>

export type AnalyticsClient = {
  capture: (event: string, properties?: Properties) => void
  identify: (userId: string) => void
  reset: () => void
}

/** Calls kept while the library loads, or dropped when it is not configured. */
const MAX_WAITING = 50

/**
 * A stand-in for the analytics library that pages can call at any time, so the
 * library itself loads after the page is usable.
 */
export function createAnalytics() {
  let client: AnalyticsClient | null = null
  let started: Promise<void> | null = null
  let waiting: Array<(target: AnalyticsClient) => void> = []

  function run(call: (target: AnalyticsClient) => void) {
    if (client) call(client)
    else if (waiting.length < MAX_WAITING) waiting.push(call)
  }

  return {
    capture: (event: string, properties?: Properties) =>
      run((target) => target.capture(event, properties)),
    identify: (userId: string) => run((target) => target.identify(userId)),
    reset: () => run((target) => target.reset()),
    start(load: () => Promise<AnalyticsClient>) {
      started ??= load().then(
        (loaded) => {
          client = loaded
          for (const call of waiting) call(loaded)
          waiting = []
        },
        // Blocked or offline: the app works the same without analytics.
        () => undefined,
      )
      return started
    },
  }
}

export const analytics = createAnalytics()
