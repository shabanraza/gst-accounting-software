import { describe, expect, test } from 'vitest'

import {
  sentryPrivacyOptions,
  shouldReportServerError,
} from '#/features/analytics/options.ts'

describe('sentryPrivacyOptions', () => {
  test('never collects bodies, cookies, headers or user details', () => {
    expect(sentryPrivacyOptions.dataCollection).toMatchObject({
      httpBodies: [],
      cookies: false,
      httpHeaders: false,
      userInfo: false,
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    })
  })

  test('sends no performance traces, whose URLs cannot all be cleaned', () => {
    expect(sentryPrivacyOptions.tracesSampleRate).toBe(0)
  })

  test('cleans events and breadcrumbs before they leave', () => {
    expect(
      sentryPrivacyOptions.beforeSend({ request: { url: '/i/tok' } }),
    ).toEqual({ request: { url: '/i/[token]' } })
    expect(
      sentryPrivacyOptions.beforeBreadcrumb({ message: 'a@b.com' }),
    ).toEqual({ message: '[email]' })
  })
})

describe('known noise', () => {
  const ignored = (message: string) =>
    sentryPrivacyOptions.ignoreErrors.some((pattern) => pattern.test(message))

  test('skips the rejection that email link scanners raise', () => {
    expect(
      ignored(
        'Non-Error promise rejection captured with value: Object Not Found Matching Id:11, MethodName:update, ParamCount:4',
      ),
    ).toBe(true)
  })

  test('still reports real failures', () => {
    for (const message of [
      'Failed to fetch',
      'Object not found',
      "Cannot read properties of undefined (reading 'update')",
    ]) {
      expect(ignored(message)).toBe(false)
    }
  })
})

describe('shouldReportServerError', () => {
  test('reports unexpected failures only', () => {
    expect(shouldReportServerError('INTERNAL_SERVER_ERROR')).toBe(true)
    expect(shouldReportServerError('BAD_REQUEST')).toBe(false)
    expect(shouldReportServerError('UNAUTHORIZED')).toBe(false)
  })
})
