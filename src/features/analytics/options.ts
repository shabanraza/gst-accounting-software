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

/** Refused input and missing sign-ins are expected; crashes are not. */
export function shouldReportServerError(code: string) {
  return code === 'INTERNAL_SERVER_ERROR'
}
