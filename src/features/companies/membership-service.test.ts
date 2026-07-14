import { describe, expect, test } from 'vitest'

import {
  listRoleCapabilities,
  roleHasCapability,
  rolesForCapability,
  type Capability,
  type CompanyRole,
} from '#/features/companies/membership-service.ts'

const ROLES: Array<CompanyRole> = [
  'owner',
  'admin',
  'accountant',
  'billing',
  'inventory',
  'readonly',
]

describe('membership capability matrix', () => {
  test('owner and admin have every capability', () => {
    const all: Array<Capability> = [
      'manage_company',
      'manage_masters',
      'manage_inventory',
      'manage_gst',
      'post_sales',
      'post_purchase',
      'post_voucher',
      'post_payment',
      'reconcile_bank',
      'view_reports',
      'view_audit',
      'view',
    ]

    for (const capability of all) {
      expect(roleHasCapability('owner', capability)).toBe(true)
      expect(roleHasCapability('admin', capability)).toBe(true)
      expect(rolesForCapability(capability)).toContain('owner')
      expect(rolesForCapability(capability)).toContain('admin')
    }
  })

  test('billing can post sales and payments but not view reports', () => {
    expect(roleHasCapability('billing', 'post_sales')).toBe(true)
    expect(roleHasCapability('billing', 'post_payment')).toBe(true)
    expect(roleHasCapability('billing', 'view')).toBe(true)
    expect(roleHasCapability('billing', 'view_reports')).toBe(false)
    expect(roleHasCapability('billing', 'reconcile_bank')).toBe(false)
  })

  test('readonly can view operational data and reports only', () => {
    expect(listRoleCapabilities('readonly')).toEqual(['view', 'view_reports'])
    expect(roleHasCapability('readonly', 'post_sales')).toBe(false)
    expect(roleHasCapability('readonly', 'manage_company')).toBe(false)
    expect(roleHasCapability('readonly', 'manage_gst')).toBe(false)
  })

  test('accountant can reconcile bank, manage gst, and view reports', () => {
    expect(roleHasCapability('accountant', 'reconcile_bank')).toBe(true)
    expect(roleHasCapability('accountant', 'manage_gst')).toBe(true)
    expect(roleHasCapability('accountant', 'view_reports')).toBe(true)
    expect(roleHasCapability('accountant', 'view_audit')).toBe(false)
  })

  test('billing and inventory cannot manage gst', () => {
    expect(roleHasCapability('billing', 'manage_gst')).toBe(false)
    expect(roleHasCapability('inventory', 'manage_gst')).toBe(false)
  })

  test('every role has at least view', () => {
    for (const role of ROLES) {
      expect(roleHasCapability(role, 'view')).toBe(true)
    }
  })
})
