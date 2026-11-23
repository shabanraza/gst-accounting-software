import { beforeEach, describe, expect, test } from 'vitest'

import {
  clearClientErrors,
  installClientErrorCapture,
  recentClientErrors,
  recordClientError,
} from '#/features/support/recent-errors.ts'

describe('recent client errors', () => {
  beforeEach(() => clearClientErrors())

  test('keeps the message and the top of the stack', () => {
    const error = new TypeError("Cannot read properties of undefined (reading 'name')")
    error.stack = [
      "TypeError: Cannot read properties of undefined (reading 'name')",
      '    at PurchasesPanel (purchases-panel.tsx:120:5)',
      '    at renderWithHooks (react-dom.js:1:1)',
      '    at a (x.js:1:1)',
      '    at b (x.js:1:1)',
      '    at c (x.js:1:1)',
    ].join('\n')

    recordClientError(error)

    const [entry] = recentClientErrors()
    expect(entry).toContain("TypeError: Cannot read properties of undefined (reading 'name')")
    expect(entry).toContain('PurchasesPanel (purchases-panel.tsx:120:5)')
    expect(entry).not.toContain('at c (x.js')
  })

  test('keeps Safari and Firefox stack frames too', () => {
    const error = new TypeError('undefined is not an object')
    error.stack = [
      'PurchasesPanel@https://hisaabkro.in/assets/app.js:10:5',
      'renderWithHooks@https://hisaabkro.in/assets/react.js:1:1',
      'a@x.js:1:1',
      'b@x.js:1:1',
    ].join('\n')

    recordClientError(error)

    const [entry] = recentClientErrors()
    expect(entry.split('\n')).toEqual([
      'TypeError: undefined is not an object',
      'PurchasesPanel@https://hisaabkro.in/assets/app.js:10:5',
      'renderWithHooks@https://hisaabkro.in/assets/react.js:1:1',
      'a@x.js:1:1',
    ])
  })

  test('captures uncaught errors and rejections once installed', () => {
    const target = new EventTarget()
    const original = globalThis.window
    globalThis.window = target as unknown as Window & typeof globalThis
    try {
      installClientErrorCapture()
      installClientErrorCapture()
      const errorEvent = Object.assign(new Event('error'), {
        error: new Error('uncaught boom'),
      })
      target.dispatchEvent(errorEvent)
      const rejection = Object.assign(new Event('unhandledrejection'), {
        reason: new Error('rejected boom'),
      })
      target.dispatchEvent(rejection)
    } finally {
      globalThis.window = original
    }

    const entries = recentClientErrors()
    expect(entries).toHaveLength(2)
    expect(entries[0]).toContain('uncaught boom')
    expect(entries[1]).toContain('rejected boom')
  })

  test('keeps only the five latest, newest last, without repeats', () => {
    for (let index = 1; index <= 7; index += 1) {
      recordClientError(new Error(`error ${index}`))
    }
    recordClientError(new Error('error 7'))

    const entries = recentClientErrors()
    expect(entries).toHaveLength(5)
    expect(entries[0]).toContain('error 3')
    expect(entries[4]).toContain('error 7')
  })

  test('records thrown non-errors and caps each entry at 1500 characters', () => {
    recordClientError('plain string')
    recordClientError(new Error('x'.repeat(5000)))

    const entries = recentClientErrors()
    expect(entries[0]).toBe('plain string')
    expect(entries[1].length).toBeLessThanOrEqual(1500)
  })
})
