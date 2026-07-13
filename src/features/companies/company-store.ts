import { and, eq, inArray } from 'drizzle-orm'

import { getDb } from '#/db/client.ts'
import * as schema from '#/db/schema.ts'

import type { AppDatabase } from '#/db/client.ts'
import type {
  BusinessType,
  CompanyProfile,
  CompanyRecord,
  CompanyRepository,
} from '#/features/companies/company-service.ts'

export class InMemoryCompanyRepository implements CompanyRepository {
  private readonly companies: Array<CompanyRecord> = []

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

  async listByIds(ids: Array<string>) {
    const idSet = new Set(ids)
    return this.companies.filter((company) => idSet.has(company.id))
  }

  async updateProfile(id: string, profile: CompanyProfile) {
    const company = this.companies.find((entry) => entry.id === id)
    if (!company) return null
    Object.assign(company, profile)
    return company
  }
}

type CompanyRow = typeof schema.companies.$inferSelect

function mapRowToCompanyRecord(row: CompanyRow): CompanyRecord {
  return {
    id: row.id,
    accountId: row.accountId,
    legalName: row.legalName,
    tradeName: row.tradeName,
    gstin: row.gstin,
    stateCode: row.stateCode,
    financialYearStart: row.financialYearStart,
    businessType: row.businessType as BusinessType,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    city: row.city,
    pincode: row.pincode,
    pan: row.pan,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    bankName: row.bankName,
    bankAccountNumber: row.bankAccountNumber,
    bankIfsc: row.bankIfsc,
    authorizedSignatory: row.authorizedSignatory,
    logoUrl: row.logoUrl,
    invoiceTerms: row.invoiceTerms,
    createdAt: row.createdAt,
  }
}

export class DrizzleCompanyRepository implements CompanyRepository {
  constructor(private readonly database: AppDatabase) {}

  async findByAccountAndGstin(accountId: string, gstin: string) {
    const companies = await this.database
      .select()
      .from(schema.companies)
      .where(
        and(
          eq(schema.companies.accountId, accountId),
          eq(schema.companies.gstin, gstin),
        ),
      )
      .limit(1)

    if (companies.length === 0) {
      return null
    }

    return mapRowToCompanyRecord(companies[0])
  }

  async create(company: CompanyRecord) {
    const [createdCompany] = await this.database
      .insert(schema.companies)
      .values({
        id: company.id,
        accountId: company.accountId,
        legalName: company.legalName,
        tradeName: company.tradeName,
        gstin: company.gstin,
        stateCode: company.stateCode,
        financialYearStart: company.financialYearStart,
        businessType: company.businessType,
        addressLine1: company.addressLine1,
        addressLine2: company.addressLine2,
        city: company.city,
        pincode: company.pincode,
        pan: company.pan,
        contactPhone: company.contactPhone,
        contactEmail: company.contactEmail,
        bankName: company.bankName,
        bankAccountNumber: company.bankAccountNumber,
        bankIfsc: company.bankIfsc,
        authorizedSignatory: company.authorizedSignatory,
        logoUrl: company.logoUrl,
        invoiceTerms: company.invoiceTerms,
        createdAt: company.createdAt,
      })
      .returning()

    return mapRowToCompanyRecord(createdCompany)
  }

  async updateProfile(id: string, profile: CompanyProfile) {
    const rows = await this.database
      .update(schema.companies)
      .set(profile)
      .where(eq(schema.companies.id, id))
      .returning()

    const updated = rows.at(0)
    return updated ? mapRowToCompanyRecord(updated) : null
  }

  async listByAccountId(accountId: string) {
    const companies = await this.database
      .select()
      .from(schema.companies)
      .where(eq(schema.companies.accountId, accountId))

    return companies.map(mapRowToCompanyRecord)
  }

  async listByIds(ids: Array<string>) {
    if (ids.length === 0) return []
    const companies = await this.database
      .select()
      .from(schema.companies)
      .where(inArray(schema.companies.id, ids))

    return companies.map(mapRowToCompanyRecord)
  }
}

export function createCompanyRepository(): CompanyRepository {
  const database = getDb()
  if (!database) {
    return new InMemoryCompanyRepository()
  }

  return new DrizzleCompanyRepository(database)
}

export const companyRepository = createCompanyRepository()
