import { describe, expect, test } from 'vitest'

import {
  auditActionCategory,
  auditActionLabel,
  auditEventChanges,
  auditEventLabel,
  buildAuditCsv,
  filterAuditEvents,
  listAuditActors,
} from '#/features/audit/audit-log-view.ts'

import type {
  AuditLogFilter,
  AuditLogRow,
} from '#/features/audit/audit-log-view.ts'

const row = (overrides: Partial<AuditLogRow>): AuditLogRow => ({
  id: crypto.randomUUID(),
  action: 'sales_invoice.posted',
  actorUserId: 'user-a',
  actorName: 'Test Owner',
  createdAt: new Date(2026, 6, 10, 11, 5),
  metadata: {},
  ...overrides,
})

describe('audit log labels', () => {
  test('names master, team and import actions in plain words', () => {
    expect(auditActionLabel('party.updated')).toBe('Party edited')
    expect(auditActionLabel('team_member.role_changed')).toBe(
      'Team role changed',
    )
    expect(auditActionLabel('opening_stock_import.committed')).toBe(
      'Opening stock imported',
    )
    expect(auditActionLabel('something.new')).toBe('something.new')
  })

  test('groups actions into categories', () => {
    expect(auditActionCategory('sales_invoice.cancelled')).toBe('documents')
    expect(auditActionCategory('contra_voucher.posted')).toBe('documents')
    expect(auditActionCategory('item.created')).toBe('masters')
    expect(auditActionCategory('godown.updated')).toBe('masters')
    expect(auditActionCategory('opening_stock.posted')).toBe('masters')
    expect(auditActionCategory('team_member.invited')).toBe('team')
    expect(auditActionCategory('company.profile_updated')).toBe('company')
    expect(auditActionCategory('company.created')).toBe('company')
    expect(auditActionCategory('item_import.committed')).toBe('imports')
  })

  test('uses the master label, then the document number, then trade name', () => {
    expect(auditEventLabel({ label: 'Test Customer' })).toBe('Test Customer')
    expect(auditEventLabel({ documentNumber: 'INV-0001' })).toBe('INV-0001')
    expect(auditEventLabel({ tradeName: 'Test Traders' })).toBe('Test Traders')
    expect(auditEventLabel({})).toBe('')
  })

  test('lists changed fields with readable names and import counts', () => {
    expect(
      auditEventChanges({
        changes: {
          paymentTermsDays: { from: 30, to: 45 },
          gstin: { from: null, to: '27AABCU9603R1ZM' },
        },
      }),
    ).toEqual([
      { field: 'Payment terms (days)', from: '30', to: '45' },
      { field: 'GSTIN', from: '', to: '27AABCU9603R1ZM' },
    ])
    expect(auditEventChanges({ label: 'x' })).toEqual([])
  })
})

describe('filterAuditEvents', () => {
  const rows = [
    row({ action: 'sales_invoice.posted', createdAt: new Date(2026, 6, 9, 23) }),
    row({
      action: 'party.created',
      actorUserId: 'user-b',
      actorName: 'Test Member',
      createdAt: new Date(2026, 6, 10, 9),
    }),
    row({ action: 'team_member.invited', createdAt: new Date(2026, 6, 12, 0, 30) }),
  ]
  const all: AuditLogFilter = {
    category: 'all',
    actorUserId: 'all',
    fromDate: '',
    toDate: '',
  }

  test('returns everything with no filters', () => {
    expect(filterAuditEvents(rows, all)).toEqual(rows)
  })

  test('filters by category, who, and an inclusive local date range', () => {
    expect(
      filterAuditEvents(rows, { ...all, category: 'masters' }).map(
        (entry) => entry.action,
      ),
    ).toEqual(['party.created'])
    expect(
      filterAuditEvents(rows, { ...all, actorUserId: 'user-a' }).map(
        (entry) => entry.action,
      ),
    ).toEqual(['sales_invoice.posted', 'team_member.invited'])
    expect(
      filterAuditEvents(rows, {
        ...all,
        fromDate: '2026-07-10',
        toDate: '2026-07-12',
      }).map((entry) => entry.action),
    ).toEqual(['party.created', 'team_member.invited'])
  })

  test('lists each person once, by name', () => {
    expect(listAuditActors(rows)).toEqual([
      { id: 'user-a', name: 'Test Owner' },
      { id: 'user-b', name: 'Test Member' },
    ])
  })
})

describe('buildAuditCsv', () => {
  test('writes a header and one escaped row per event', () => {
    const csv = buildAuditCsv([
      row({
        metadata: { documentNumber: 'INV-0001', amount: '118.00' },
      }),
      row({
        action: 'party.updated',
        actorName: 'Test "Boss"',
        metadata: {
          label: '=Test, Customer',
          changes: { city: { from: 'Pune', to: 'Mumbai' } },
        },
      }),
    ])

    expect(csv.split('\r\n')).toEqual([
      'When,Who,Action,Document,Amount,Changes',
      '2026-07-10 11:05,Test Owner,Sales invoice saved,INV-0001,118.00,',
      '2026-07-10 11:05,"Test ""Boss""",Party edited,"\'=Test, Customer",,City: Pune → Mumbai',
    ])
  })
})
