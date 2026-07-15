import { describe, expect, it } from 'vitest'

import {
  buildCreateGodownInput,
  buildUpdateGodownInput,
  createInitialGodownForm,
  validateGodownForm,
} from './godown-form.ts'

describe('godown-form', () => {
  it('validates name', () => {
    expect(validateGodownForm(createInitialGodownForm())).toBe(
      'Godown name is required.',
    )
    expect(validateGodownForm(createInitialGodownForm('Main'))).toBeNull()
  })

  it('builds create and update payloads', () => {
    const form = createInitialGodownForm('Main')
    expect(buildCreateGodownInput(form, 'company-1')).toEqual({
      companyId: 'company-1',
      name: 'Main',
    })
    expect(buildUpdateGodownInput(form, 'company-1', 'godown-1')).toEqual({
      companyId: 'company-1',
      godownId: 'godown-1',
      name: 'Main',
    })
  })
})
