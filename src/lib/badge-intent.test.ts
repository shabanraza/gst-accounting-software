import { describe, expect, test } from 'vitest'

import {
  ageingBucketBadgeIntent,
  ageingBucketChartColor,
  paymentStatusBadgeIntent,
  toolCheckBadgeIntent,
} from '#/lib/badge-intent.ts'

describe('paymentStatusBadgeIntent', () => {
  test('Paid is success green', () => {
    expect(paymentStatusBadgeIntent('Paid')).toBe('success')
  })

  test('Part paid is warning amber', () => {
    expect(paymentStatusBadgeIntent('Part paid')).toBe('warning')
  })

  test('Pending is warning amber (industry waiting signal, not info blue)', () => {
    expect(paymentStatusBadgeIntent('Pending')).toBe('warning')
  })
})

describe('ageingBucketBadgeIntent', () => {
  test('escalates from healthy current through amber to overdue red', () => {
    expect(ageingBucketBadgeIntent('not-due')).toBe('success')
    expect(ageingBucketBadgeIntent('1-30')).toBe('warning')
    expect(ageingBucketBadgeIntent('31-60')).toBe('inventory')
    expect(ageingBucketBadgeIntent('61-90')).toBe('money-out')
    expect(ageingBucketBadgeIntent('90+')).toBe('destructive')
  })
})

describe('ageingBucketChartColor', () => {
  test('maps each bucket to a risk-scale CSS variable, never GST purple', () => {
    expect(ageingBucketChartColor('not-due')).toBe('var(--success)')
    expect(ageingBucketChartColor('1-30')).toBe('var(--warning)')
    expect(ageingBucketChartColor('31-60')).toBe('var(--inventory)')
    expect(ageingBucketChartColor('61-90')).toBe('var(--money-out)')
    expect(ageingBucketChartColor('90+')).toBe('var(--destructive)')

    for (const bucket of [
      'not-due',
      '1-30',
      '31-60',
      '61-90',
      '90+',
    ] as const) {
      expect(ageingBucketChartColor(bucket)).not.toMatch(/gst|chart-3/i)
    }
  })
})

describe('toolCheckBadgeIntent', () => {
  test('maps check outcomes to status colours', () => {
    expect(toolCheckBadgeIntent('pass')).toBe('success')
    expect(toolCheckBadgeIntent('action')).toBe('warning')
    expect(toolCheckBadgeIntent('fail')).toBe('destructive')
    expect(toolCheckBadgeIntent('info')).toBe('info')
  })
})
