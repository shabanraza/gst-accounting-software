import { describe, expect, test } from 'vitest'

import {
  POSTHOG_OPTIONS,
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

describe('POSTHOG_OPTIONS', () => {
  test('records no clicks, screens, console or exceptions', () => {
    expect(POSTHOG_OPTIONS).toMatchObject({
      autocapture: false,
      disable_session_recording: true,
      capture_exceptions: false,
      enable_heatmaps: false,
      capture_dead_clicks: false,
      disable_surveys: true,
      disable_external_dependency_loading: true,
      advanced_disable_flags: true,
    })
  })

  test('cleans page addresses on every event', () => {
    expect(
      POSTHOG_OPTIONS.before_send({
        event: '$pageview',
        properties: { $current_url: 'https://x.in/i/tok' },
      }),
    ).toEqual({
      event: '$pageview',
      properties: { $current_url: 'https://x.in/i/[token]' },
    })
    expect(POSTHOG_OPTIONS.before_send(null)).toBeNull()
  })
})

describe('shouldReportServerError', () => {
  test('reports unexpected failures only', () => {
    expect(shouldReportServerError('INTERNAL_SERVER_ERROR')).toBe(true)
    expect(shouldReportServerError('BAD_REQUEST')).toBe(false)
    expect(shouldReportServerError('UNAUTHORIZED')).toBe(false)
  })
})
