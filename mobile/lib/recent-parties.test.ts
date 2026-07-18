import { describe, expect, it } from 'vitest'

describe('recent-parties storage keys', () => {
  it('uses SecureStore-safe key characters only', () => {
    const companyId = 'company-uuid-123'
    const role = 'supplier'
    const key = `recent-parties_${companyId}_${role}`

    expect(key).not.toMatch(/[^a-zA-Z0-9._-]/)
    expect(key).not.toContain(':')
  })
})
