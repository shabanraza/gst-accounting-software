import { describe, expect, it } from 'vitest'

import {
  buildUpdateCompanyProfileInput,
  createInitialCompanyProfileForm,
} from './company-profile-form.ts'

describe('company-profile-form', () => {
  it('initializes from company source', () => {
    expect(
      createInitialCompanyProfileForm({
        city: 'Mumbai',
        pan: 'ABCDE1234F',
      }),
    ).toMatchObject({
      city: 'Mumbai',
      pan: 'ABCDE1234F',
    })
  })

  it('builds update payload', () => {
    const form = createInitialCompanyProfileForm({ city: 'Mumbai' })
    expect(buildUpdateCompanyProfileInput(form, 'company-1')).toMatchObject({
      companyId: 'company-1',
      city: 'Mumbai',
    })
  })
})
