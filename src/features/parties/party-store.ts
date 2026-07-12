import { and, eq, sql } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  PartyRecord,
  PartyRepository,
  PartyType,
} from '#/features/parties/party-service.ts'

export class InMemoryPartyRepository implements PartyRepository {
  private readonly parties: Array<PartyRecord> = []

  async findByCompanyAndName(companyId: string, name: string) {
    return (
      this.parties.find(
        (party) =>
          party.companyId === companyId &&
          party.name.toLowerCase() === name.toLowerCase(),
      ) ?? null
    )
  }

  async create(party: PartyRecord) {
    this.parties.push(party)
    return party
  }

  async listByCompanyId(companyId: string) {
    return this.parties.filter((party) => party.companyId === companyId)
  }
}

type PartyRow = typeof schema.parties.$inferSelect

function mapRowToPartyRecord(row: PartyRow): PartyRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    partyType: row.partyType as PartyType,
    gstin: row.gstin,
    pan: row.pan,
    stateCode: row.stateCode,
    billingAddress: row.billingAddress,
    shippingAddress: row.shippingAddress,
    creditLimit: row.creditLimit,
    paymentTermsDays: row.paymentTermsDays,
    priceListId: row.priceListId ?? null,
    receivableAccountId: row.receivableAccountId,
    payableAccountId: row.payableAccountId,
    createdAt: row.createdAt,
  }
}

export class DrizzlePartyRepository implements PartyRepository {
  constructor(private readonly database: AppDatabase) {}

  async findByCompanyAndName(companyId: string, name: string) {
    const parties = await this.database
      .select()
      .from(schema.parties)
      .where(
        and(
          eq(schema.parties.companyId, companyId),
          sql`lower(${schema.parties.name}) = ${name.toLowerCase()}`,
        ),
      )
      .limit(1)

    if (parties.length === 0) {
      return null
    }

    return mapRowToPartyRecord(parties[0])
  }

  async create(party: PartyRecord) {
    const [createdParty] = await this.database
      .insert(schema.parties)
      .values({
        id: party.id,
        companyId: party.companyId,
        name: party.name,
        partyType: party.partyType,
        gstin: party.gstin,
        pan: party.pan ?? '',
        stateCode: party.stateCode,
        billingAddress: party.billingAddress ?? '',
        shippingAddress: party.shippingAddress ?? '',
        creditLimit: party.creditLimit,
        paymentTermsDays: party.paymentTermsDays,
        priceListId: party.priceListId,
        receivableAccountId: party.receivableAccountId,
        payableAccountId: party.payableAccountId,
        createdAt: party.createdAt,
      })
      .returning()

    return mapRowToPartyRecord(createdParty)
  }

  async listByCompanyId(companyId: string) {
    const parties = await this.database
      .select()
      .from(schema.parties)
      .where(eq(schema.parties.companyId, companyId))

    return parties.map(mapRowToPartyRecord)
  }
}

export function createPartyRepository(): PartyRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryPartyRepository()
  }

  return new DrizzlePartyRepository(database)
}

export const partyRepository = createPartyRepository()
