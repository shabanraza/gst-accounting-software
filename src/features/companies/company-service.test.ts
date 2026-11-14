import { describe, expect, test } from 'vitest'

import {
  DuplicateCompanyGstinError,
  InvalidUpiIdError,
  createCompany,
  emptyCompanyProfile,
  listCompaniesByAccount,
  updateCompanyProfile,
} from '#/features/companies/company-service.ts'
import { InMemoryCompanyRepository as StoreCompanyRepository } from '#/features/companies/company-store.ts'
import type {
  CompanyRecord,
  CompanyRepository,
} from '#/features/companies/company-service.ts'

class InMemoryCompanyRepository implements CompanyRepository {
  private companies: Array<CompanyRecord> = []

  async findByAccountAndGstin(accountId: string, gstin: string) {
    return (
      this.companies.find(
        (company) => company.accountId === accountId && company.gstin === gstin,
      ) ?? null
    )
  }

  async create(company: CompanyRecord) {
    this.companies.push(company)
    return company
  }

  async listByAccountId(accountId: string) {
    return this.companies.filter((company) => company.accountId === accountId)
  }

  list() {
    return this.companies
  }
}

describe('createCompany', () => {
  test('creates two companies under one account with separate GSTIN scope', async () => {
    const repository = new InMemoryCompanyRepository()

    const firstCompany = await createCompany(repository, {
      accountId: 'account-1',
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })

    const secondCompany = await createCompany(repository, {
      accountId: 'account-1',
      legalName: 'Noor Trading Private Limited',
      tradeName: 'Noor Trading',
      gstin: '24ABCDE1234F1Z5',
      stateCode: '24',
      financialYearStart: '2026-04-01',
      businessType: 'trading',
    })

    expect(firstCompany.accountId).toBe('account-1')
    expect(secondCompany.accountId).toBe('account-1')
    expect(firstCompany.id).not.toBe(secondCompany.id)
    expect(firstCompany.gstin).toBe('27ABCDE1234F1Z5')
    expect(secondCompany.gstin).toBe('24ABCDE1234F1Z5')
    expect(repository.list()).toHaveLength(2)
  })

  test('rejects duplicate GSTIN within the same account', async () => {
    const repository = new InMemoryCompanyRepository()

    await createCompany(repository, {
      accountId: 'account-1',
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })

    await expect(
      createCompany(repository, {
        accountId: 'account-1',
        legalName: 'Duplicate GST Company',
        tradeName: 'Duplicate GST',
        gstin: '27abcde1234f1z5',
        stateCode: '27',
        financialYearStart: '2026-04-01',
        businessType: 'trading',
      }),
    ).rejects.toBeInstanceOf(DuplicateCompanyGstinError)
  })

  test('allows the same GSTIN in a different account scope', async () => {
    const repository = new InMemoryCompanyRepository()

    await createCompany(repository, {
      accountId: 'account-1',
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })

    const company = await createCompany(repository, {
      accountId: 'account-2',
      legalName: 'Second Account Company',
      tradeName: 'Second Account',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'trading',
    })

    expect(company.accountId).toBe('account-2')
    expect(repository.list()).toHaveLength(2)
  })

  test('lists companies by account without leaking other account data', async () => {
    const repository = new InMemoryCompanyRepository()

    await createCompany(repository, {
      accountId: 'account-1',
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: '27ABCDE1234F1Z5',
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })

    await createCompany(repository, {
      accountId: 'account-2',
      legalName: 'Noor Trading Private Limited',
      tradeName: 'Noor Trading',
      gstin: '24ABCDE1234F1Z5',
      stateCode: '24',
      financialYearStart: '2026-04-01',
      businessType: 'trading',
    })

    const companies = await listCompaniesByAccount(repository, 'account-1')

    expect(companies).toHaveLength(1)
    expect(companies[0]?.tradeName).toBe('Shaban Textiles')
  })
})

describe('updateCompanyProfile UPI ID', () => {
  async function setup() {
    const repository = new StoreCompanyRepository()
    const company = await createCompany(repository, {
      accountId: 'account-1',
      legalName: 'Shaban Textiles Private Limited',
      tradeName: 'Shaban Textiles',
      gstin: null,
      stateCode: '27',
      financialYearStart: '2026-04-01',
      businessType: 'wholesale',
    })
    return { repository, company }
  }

  test('new companies start without a UPI ID', async () => {
    const { company } = await setup()
    expect(company.upiId).toBe('')
  })

  test('saves a valid UPI ID, trimmed', async () => {
    const { repository, company } = await setup()
    const updated = await updateCompanyProfile(repository, company.id, {
      ...emptyCompanyProfile,
      upiId: '  shaban.textiles@okhdfc ',
    })
    expect(updated?.upiId).toBe('shaban.textiles@okhdfc')
  })

  test('allows clearing the UPI ID', async () => {
    const { repository, company } = await setup()
    const updated = await updateCompanyProfile(repository, company.id, {
      ...emptyCompanyProfile,
      upiId: '   ',
    })
    expect(updated?.upiId).toBe('')
  })

  test.each(['shaban', 'shaban@', '@okhdfc', 'shaban@okhdfc.com', 'a b@ybl'])(
    'rejects an invalid UPI ID %j',
    async (upiId) => {
      const { repository, company } = await setup()
      await expect(
        updateCompanyProfile(repository, company.id, {
          ...emptyCompanyProfile,
          upiId,
        }),
      ).rejects.toBeInstanceOf(InvalidUpiIdError)
    },
  )
})
