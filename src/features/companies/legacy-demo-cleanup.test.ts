import { describe, expect, test } from 'vitest'

import { planLegacyDemoCleanup } from '#/features/companies/legacy-demo-cleanup.ts'

import type {
  CompanySnapshot,
  SnapshotMovement,
} from '#/features/companies/legacy-demo-cleanup.ts'

const legacyBefore = new Date('2026-10-28T00:00:00Z')
const before = new Date('2026-08-01T00:00:00Z')
const after = new Date('2026-10-29T00:00:00Z')

function movement(overrides: Partial<SnapshotMovement>): SnapshotMovement {
  return {
    id: crypto.randomUUID(),
    itemId: 'item-cotton',
    direction: 'in',
    quantity: '100',
    referenceType: 'starter_opening',
    godownName: null,
    createdAt: before,
    ...overrides,
  }
}

function snapshot(overrides: Partial<CompanySnapshot> = {}): CompanySnapshot {
  return {
    parties: [
      { id: 'party-noor', name: 'Noor Retailers', gstin: '27AABCU9603R1ZM' },
      { id: 'party-real', name: 'Real Customer', gstin: null },
    ],
    items: [
      { id: 'item-cotton', name: 'Cotton Fabric', hsnCode: '5208' },
      { id: 'item-real', name: 'Real Item', hsnCode: '1234' },
    ],
    godowns: [
      { id: 'gd-main', name: 'Main Godown', isDefault: true },
      { id: 'gd-show', name: 'Showroom', isDefault: false },
    ],
    movements: [],
    referencedPartyIds: new Set(),
    referencedItemIds: new Set(),
    usedGodownNames: new Set(),
    ...overrides,
  }
}

describe('planLegacyDemoCleanup', () => {
  test('removes unused demo masters and their seeded stock', () => {
    const seeded = movement({})
    const plan = planLegacyDemoCleanup(snapshot({ movements: [seeded] }), {
      legacyBefore,
    })

    expect(plan.removePartyIds).toEqual(['party-noor'])
    expect(plan.removeItemIds).toEqual(['item-cotton'])
    expect(plan.removeGodownIds).toEqual(['gd-show'])
    expect(plan.removeMovementIds).toEqual([seeded.id])
    expect(plan.balances).toEqual([{ itemId: 'item-cotton', quantity: '0' }])
  })

  test('only matches demo masters by name and their demo GSTIN or HSN', () => {
    const plan = planLegacyDemoCleanup(
      snapshot({
        parties: [
          { id: 'p1', name: 'Noor Retailers', gstin: '09ABCDE1234F1Z5' },
        ],
        items: [{ id: 'i1', name: 'Cotton Fabric', hsnCode: '5209' }],
      }),
      { legacyBefore },
    )

    expect(plan.removePartyIds).toEqual([])
    expect(plan.removeItemIds).toEqual([])
  })

  test('keeps demo masters that real documents use', () => {
    const plan = planLegacyDemoCleanup(
      snapshot({
        movements: [movement({})],
        referencedPartyIds: new Set(['party-noor']),
        referencedItemIds: new Set(['item-cotton']),
        usedGodownNames: new Set(['Showroom']),
      }),
      { legacyBefore },
    )

    expect(plan.removePartyIds).toEqual([])
    expect(plan.removeItemIds).toEqual([])
    expect(plan.removeGodownIds).toEqual([])
    expect(plan.keepParties).toEqual([
      { id: 'party-noor', name: 'Noor Retailers', reason: 'used in documents' },
    ])
  })

  test('keeps seeded stock that was already sold, so no balance goes negative', () => {
    const seeded = movement({})
    const sale = movement({
      direction: 'out',
      quantity: '4',
      referenceType: 'sales_invoice',
      createdAt: after,
    })
    const plan = planLegacyDemoCleanup(
      snapshot({
        movements: [seeded, sale],
        referencedItemIds: new Set(['item-cotton']),
      }),
      { legacyBefore },
    )

    expect(plan.removeMovementIds).toEqual([])
    expect(plan.keepItems).toEqual([
      {
        id: 'item-cotton',
        name: 'Cotton Fabric',
        reason: '4 units already sold or moved out of the seeded stock',
      },
    ])
    expect(plan.balances).toEqual([])
  })

  test('treats the old default 100-unit opening as fake only on demo items unless asked', () => {
    const demoDefault = movement({ referenceType: 'item_opening' })
    const userDefault = movement({
      itemId: 'item-real',
      referenceType: 'item_opening',
    })

    const plan = planLegacyDemoCleanup(
      snapshot({ movements: [demoDefault, userDefault] }),
      { legacyBefore },
    )
    expect(plan.removeMovementIds).toEqual([demoDefault.id])
    expect(plan.reviewMovements).toEqual([
      { id: userDefault.id, itemId: 'item-real', itemName: 'Real Item' },
    ])

    const withDefaults = planLegacyDemoCleanup(
      snapshot({ movements: [demoDefault, userDefault] }),
      { legacyBefore, includeDefaultOpenings: true },
    )
    expect(withDefaults.removeMovementIds).toEqual([
      demoDefault.id,
      userDefault.id,
    ])
    expect(withDefaults.balances).toContainEqual({
      itemId: 'item-real',
      quantity: '0',
    })
  })

  test('never touches openings entered after the legacy cutoff or other quantities', () => {
    const recent = movement({
      itemId: 'item-real',
      referenceType: 'item_opening',
      createdAt: after,
    })
    const typed = movement({
      itemId: 'item-real',
      referenceType: 'item_opening',
      quantity: '37',
    })
    const plan = planLegacyDemoCleanup(
      snapshot({ movements: [recent, typed] }),
      { legacyBefore, includeDefaultOpenings: true },
    )

    expect(plan.removeMovementIds).toEqual([])
    expect(plan.reviewMovements).toEqual([])
  })

  test('keeps a demo godown that remaining stock movements use', () => {
    const plan = planLegacyDemoCleanup(
      snapshot({
        movements: [
          movement({
            itemId: 'item-real',
            referenceType: 'purchase_bill',
            quantity: '5',
            godownName: 'Showroom',
            createdAt: after,
          }),
        ],
      }),
      { legacyBefore },
    )

    expect(plan.removeGodownIds).toEqual([])
    expect(plan.keepGodowns).toEqual([
      { id: 'gd-show', name: 'Showroom', reason: 'holds stock movements' },
    ])
  })
})
