import { redactDeep } from '#/features/analytics/redact.ts'

/**
 * Shared by the browser and Worker Sentry clients. HisaabKro handles passwords
 * and business books, so only the error itself is sent: no request bodies,
 * cookies, headers or user details, and no performance traces.
 */
export const sentryPrivacyOptions = {
  dataCollection: {
    userInfo: false,
    cookies: false,
    httpHeaders: false,
    httpBodies: [] as [],
    urlQueryParams: false,
    databaseQueryData: false,
    stackFrameVariables: false,
  },
  tracesSampleRate: 0,
  beforeSend: <T>(event: T) => redactDeep(event),
  beforeBreadcrumb: <T>(breadcrumb: T) => redactDeep(breadcrumb),
}

/**
 * PostHog counts page views and the named product events only. Clicks, screen
 * recordings and error capture stay off, whatever the project settings say.
 */
export const POSTHOG_OPTIONS = {
  defaults: '2025-05-24',
  person_profiles: 'identified_only',
  autocapture: false,
  capture_exceptions: false,
  capture_dead_clicks: false,
  capture_performance: false,
  enable_heatmaps: false,
  disable_session_recording: true,
  disable_surveys: true,
  disable_external_dependency_loading: true,
  // The app uses no feature flags, and that request skips `before_send`.
  advanced_disable_flags: true,
  before_send: <T>(event: T) => redactDeep(event),
} as const

/** Refused input and missing sign-ins are expected; crashes are not. */
export function shouldReportServerError(code: string) {
  return code === 'INTERNAL_SERVER_ERROR'
}
