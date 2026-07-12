import { describe, expect, test } from 'vitest'

import { createParty } from '#/features/parties/party-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'

class InMemoryPartyRepository implements PartyRepository {
  private parties: Array<PartyRecord> = []

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

  list() {
    return this.parties
  }
}

describe('createParty', () => {
  test('creates a customer with GSTIN, state, credit limit, and payment terms', async () => {
    const repository = new InMemoryPartyRepository()

    const customer = await createParty(repository, {
      companyId: 'company-1',
      name: 'Noor Retailers',
      partyType: 'customer',
      gstin: '27AABCU9603R1ZM',
      stateCode: '27',
      creditLimit: '100000.00',
      paymentTermsDays: 30,
      receivableAccountId: 'recv-1',
      payableAccountId: null,
    })

    expect(customer.partyType).toBe('customer')
    expect(customer.gstin).toBe('27AABCU9603R1ZM')
    expect(customer.stateCode).toBe('27')
    expect(customer.creditLimit).toBe('100000.00')
    expect(customer.paymentTermsDays).toBe(30)
    expect(customer.receivableAccountId).toBe('recv-1')
    expect(customer.companyId).toBe('company-1')
  })

  test('creates a supplier with GSTIN and payable account mapping', async () => {
    const repository = new InMemoryPartyRepository()

    const supplier = await createParty(repository, {
      companyId: 'company-1',
      name: 'Textile Mills Ltd',
      partyType: 'supplier',
      gstin: '24AABCU9603R1ZM',
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 15,
      receivableAccountId: null,
      payableAccountId: 'pay-1',
    })

    expect(supplier.partyType).toBe('supplier')
    expect(supplier.payableAccountId).toBe('pay-1')
    expect(supplier.gstin).toBe('24AABCU9603R1ZM')
  })

  test('allows the same party name in different companies', async () => {
    const repository = new InMemoryPartyRepository()

    await createParty(repository, {
      companyId: 'company-1',
      name: 'Shared Party',
      partyType: 'customer',
      gstin: null,
      stateCode: '27',
      creditLimit: null,
      paymentTermsDays: 0,
      receivableAccountId: 'recv-1',
      payableAccountId: null,
    })

    const second = await createParty(repository, {
      companyId: 'company-2',
      name: 'Shared Party',
      partyType: 'customer',
      gstin: null,
      stateCode: '24',
      creditLimit: null,
      paymentTermsDays: 0,
      receivableAccountId: 'recv-2',
      payableAccountId: null,
    })

    expect(second.companyId).toBe('company-2')
    expect(repository.list()).toHaveLength(2)
  })

  test('rejects duplicate party names within the same company', async () => {
    const repository = new InMemoryPartyRepository()

    await createParty(repository, {
      companyId: 'company-1',
      name: 'Noor Retailers',
      partyType: 'customer',
      gstin: null,
      stateCode: '27',
      creditLimit: null,
      paymentTermsDays: 0,
      receivableAccountId: 'recv-1',
      payableAccountId: null,
    })

    await expect(
      createParty(repository, {
        companyId: 'company-1',
        name: 'noor retailers',
        partyType: 'supplier',
        gstin: null,
        stateCode: '27',
        creditLimit: null,
        paymentTermsDays: 0,
        receivableAccountId: null,
        payableAccountId: 'pay-1',
      }),
    ).rejects.toThrow(/already exists/i)
  })
})
