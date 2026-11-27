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

describe('shouldReportServerError', () => {
  test('reports unexpected failures only', () => {
    expect(shouldReportServerError('INTERNAL_SERVER_ERROR')).toBe(true)
    expect(shouldReportServerError('BAD_REQUEST')).toBe(false)
    expect(shouldReportServerError('UNAUTHORIZED')).toBe(false)
  })
})
