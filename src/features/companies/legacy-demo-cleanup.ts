import Decimal from 'decimal.js'

/**
 * Demo masters that app versions before PR #25 seeded into every new company.
 * A record only matches when both its name and its demo GSTIN/HSN match, so a
 * real party or item that happens to share a name is never touched.
 */
export const LEGACY_DEMO_PARTIES = [
  { name: 'Noor Retailers', gstin: '27AABCU9603R1ZM' },
  { name: 'City Brokers', gstin: '27BBBCD1234E1Z5' },
  { name: 'Gujarat Fab Mart', gstin: '24CCCDE5678F1Z2' },
  { name: 'Textile Mills Ltd', gstin: '24AABCU9603R1ZM' },
  { name: 'Surat Yarn House', gstin: '24DDDEF9012G1Z8' },
]

export const LEGACY_DEMO_ITEMS = [
  { name: 'Cotton Fabric', hsnCode: '5208' },
  { name: 'Silk Blend', hsnCode: '5007' },
  { name: 'Cutting Service', hsnCode: '9988' },
]

/** "Main Godown" is the real default godown and is never removed. */
export const LEGACY_DEMO_GODOWNS = ['Showroom', 'Godown-2']

/** The quantity old versions used when an opening quantity was left blank. */
const LEGACY_DEFAULT_OPENING = new Decimal(100)

export type SnapshotMovement = {
  id: string
  itemId: string
  direction: 'in' | 'out'
  quantity: string
  referenceType: string
  godownName: string | null
  createdAt: Date
}

export type CompanySnapshot = {
  parties: Array<{ id: string; name: string; gstin: string | null }>
  items: Array<{ id: string; name: string; hsnCode: string }>
  godowns: Array<{ id: string; name: string; isDefault: boolean }>
  movements: Array<SnapshotMovement>
  /** Parties used by any invoice, bill, note, order, quotation or GRN. */
  referencedPartyIds: Set<string>
  /** Items used by any document line or price list. */
  referencedItemIds: Set<string>
  /** Godown names used by any document header or line. */
  usedGodownNames: Set<string>
}

export type CleanupOptions = {
  /** Openings created before this instant can be legacy defaults. */
  legacyBefore: Date
  /** Also remove 100-unit default openings on the user's own items. */
  includeDefaultOpenings?: boolean
}

type Kept = { id: string; name: string; reason: string }

export type CleanupPlan = {
  removePartyIds: Array<string>
  removeItemIds: Array<string>
  removeGodownIds: Array<string>
  removeMovementIds: Array<string>
  /** New on-hand quantity for every item whose movements change. */
  balances: Array<{ itemId: string; quantity: string }>
  keepParties: Array<Kept>
  keepItems: Array<Kept>
  keepGodowns: Array<Kept>
  /** Default-looking openings on user items, left for the owner to decide. */
  reviewMovements: Array<{ id: string; itemId: string; itemName: string }>
}

function signed(movement: SnapshotMovement) {
  const quantity = new Decimal(movement.quantity)
  return movement.direction === 'in' ? quantity : quantity.negated()
}

export function planLegacyDemoCleanup(
  snapshot: CompanySnapshot,
  options: CleanupOptions,
): CleanupPlan {
  const demoItems = snapshot.items.filter((item) =>
    LEGACY_DEMO_ITEMS.some(
      (demo) => demo.name === item.name && demo.hsnCode === item.hsnCode,
    ),
  )
  const demoItemIds = new Set(demoItems.map((item) => item.id))
  const itemName = new Map(snapshot.items.map((item) => [item.id, item.name]))

  const reviewMovements: CleanupPlan['reviewMovements'] = []
  const isFake = (movement: SnapshotMovement) => {
    if (movement.referenceType === 'starter_opening') return true
    const legacyDefault =
      movement.referenceType === 'item_opening' &&
      movement.direction === 'in' &&
      new Decimal(movement.quantity).equals(LEGACY_DEFAULT_OPENING) &&
      movement.createdAt < options.legacyBefore
    if (!legacyDefault) return false
    if (demoItemIds.has(movement.itemId) || options.includeDefaultOpenings) {
      return true
    }
    reviewMovements.push({
      id: movement.id,
      itemId: movement.itemId,
      itemName: itemName.get(movement.itemId) ?? movement.itemId,
    })
    return false
  }

  const fakeByItem = new Map<string, Array<SnapshotMovement>>()
  const realByItem = new Map<string, Array<SnapshotMovement>>()
  for (const movement of snapshot.movements) {
    const bucket = isFake(movement) ? fakeByItem : realByItem
    bucket.set(movement.itemId, [
      ...(bucket.get(movement.itemId) ?? []),
      movement,
    ])
  }

  const removeMovementIds: Array<string> = []
  const balances: CleanupPlan['balances'] = []
  const keepItems: Array<Kept> = []
  const itemsKeepingMovements = new Set<string>()

  for (const [itemId, fake] of fakeByItem) {
    const real = realByItem.get(itemId) ?? []
    const remaining = real.reduce(
      (sum, movement) => sum.plus(signed(movement)),
      new Decimal(0),
    )
    // Stock already sold out of the seeded quantity cannot be removed without
    // driving the item negative; the owner has to correct it with a document.
    if (remaining.isNegative()) {
      itemsKeepingMovements.add(itemId)
      keepItems.push({
        id: itemId,
        name: itemName.get(itemId) ?? itemId,
        reason: `${remaining.negated().toString()} units already sold or moved out of the seeded stock`,
      })
      continue
    }
    removeMovementIds.push(...fake.map((movement) => movement.id))
    balances.push({ itemId, quantity: remaining.toString() })
  }

  const removeItemIds: Array<string> = []
  for (const item of demoItems) {
    if (itemsKeepingMovements.has(item.id)) continue
    if (snapshot.referencedItemIds.has(item.id)) {
      keepItems.push({
        id: item.id,
        name: item.name,
        reason: 'used in documents',
      })
    } else if ((realByItem.get(item.id) ?? []).length > 0) {
      keepItems.push({
        id: item.id,
        name: item.name,
        reason: 'has stock movements',
      })
    } else {
      removeItemIds.push(item.id)
    }
  }

  const removePartyIds: Array<string> = []
  const keepParties: Array<Kept> = []
  for (const party of snapshot.parties) {
    const isDemo = LEGACY_DEMO_PARTIES.some(
      (demo) => demo.name === party.name && demo.gstin === party.gstin,
    )
    if (!isDemo) continue
    if (snapshot.referencedPartyIds.has(party.id)) {
      keepParties.push({
        id: party.id,
        name: party.name,
        reason: 'used in documents',
      })
    } else {
      removePartyIds.push(party.id)
    }
  }

  const removedMovementIds = new Set(removeMovementIds)
  const godownsWithMovements = new Set(
    snapshot.movements
      .filter((movement) => !removedMovementIds.has(movement.id))
      .map((movement) => movement.godownName),
  )
  const removeGodownIds: Array<string> = []
  const keepGodowns: Array<Kept> = []
  for (const godown of snapshot.godowns) {
    if (godown.isDefault || !LEGACY_DEMO_GODOWNS.includes(godown.name)) continue
    if (snapshot.usedGodownNames.has(godown.name)) {
      keepGodowns.push({
        id: godown.id,
        name: godown.name,
        reason: 'used in documents',
      })
    } else if (godownsWithMovements.has(godown.name)) {
      keepGodowns.push({
        id: godown.id,
        name: godown.name,
        reason: 'holds stock movements',
      })
    } else {
      removeGodownIds.push(godown.id)
    }
  }

  return {
    removePartyIds,
    removeItemIds,
    removeGodownIds,
    removeMovementIds,
    balances,
    keepParties,
    keepItems,
    keepGodowns,
    reviewMovements,
  }
}
