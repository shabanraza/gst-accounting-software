import { describe, expect, test } from 'vitest'

import { buildSetupChecklist } from '#/features/dashboard/setup-checklist.ts'

const fullAddress = {
  addressLine1: '12 MG Road',
  city: 'Pune',
  pincode: '411001',
}
const noProgress = { hasParty: false, hasItem: false, hasSale: false }

describe('buildSetupChecklist', () => {
  test('lists the first steps in order, none done for a new company', () => {
    const checklist = buildSetupChecklist({
      company: { addressLine1: '', city: '', pincode: '' },
      setup: noProgress,
    })

    expect(checklist.steps.map((step) => [step.key, step.done])).toEqual([
      ['company', false],
      ['party', false],
      ['item', false],
      ['sale', false],
    ])
    expect(checklist.doneCount).toBe(0)
    expect(checklist.show).toBe(true)
  })

  test('marks company details done once address, city and PIN are filled', () => {
    const checklist = buildSetupChecklist({
      company: fullAddress,
      setup: { hasParty: true, hasItem: false, hasSale: false },
    })

    expect(
      checklist.steps.filter((step) => step.done).map((step) => step.key),
    ).toEqual(['company', 'party'])
    expect(checklist.doneCount).toBe(2)
  })

  test('treats blank-looking fields as missing', () => {
    const checklist = buildSetupChecklist({
      company: { addressLine1: '  ', city: 'Pune', pincode: '411001' },
      setup: noProgress,
    })

    expect(checklist.steps[0].done).toBe(false)
  })

  test('hides once the first sale is made, even if other steps are open', () => {
    const checklist = buildSetupChecklist({
      company: { addressLine1: '', city: '', pincode: '' },
      setup: { hasParty: true, hasItem: false, hasSale: true },
    })

    expect(checklist.show).toBe(false)
  })
})
