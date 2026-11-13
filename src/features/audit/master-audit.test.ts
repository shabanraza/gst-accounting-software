import { beforeEach, describe, expect, test } from 'vitest'

import { setupDefaultChartOfAccounts } from '#/features/accounting/chart-of-accounts.ts'
import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createPostingTransaction } from '#/features/accounting/posting-transaction.ts'
import {
  diffFields,
  recordMasterEvent,
} from '#/features/audit/audit-service.ts'
import { InMemoryAuditLogRepository } from '#/features/audit/audit-store.ts'
import { createCompaniesRouter } from '#/features/companies/company-router.ts'
import { InMemoryCompanyRepository } from '#/features/companies/company-store.ts'
import { InMemoryFinancialYearRepository } from '#/features/companies/financial-year-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import { InMemoryDashboardSummaryRepository } from '#/features/dashboard/dashboard-store.ts'
import { InMemoryDocumentSequenceRepository } from '#/features/documents/document-sequence-store.ts'
import { createImportsRouter } from '#/features/imports/imports-router.ts'
import { InMemoryGodownRepository } from '#/features/inventory/godown-store.ts'
import { createInventoryRouter } from '#/features/inventory/inventory-router.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { InMemoryPriceListRepository } from '#/features/inventory/price-list-store.ts'
import { createPartiesRouter } from '#/features/parties/party-router.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { InMemoryInvitationRepository } from '#/features/team/invitation-store.ts'
import { createTeamRouter } from '#/features/team/team-router.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { PostingRepositories } from '#/features/accounting/posting-transaction.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const userId = crypto.randomUUID()
const memberUserId = crypto.randomUUID()
const companyId = crypto.randomUUID()

const context: TRPCContext = {
  session: {
    user: { id: userId, email: 'owner@example.com', name: 'Test Owner' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
}

describe('diffFields', () => {
  test('lists only the fields that changed, treating missing as empty', () => {
    expect(
      diffFields(
        { name: 'Old', city: 'Pune', gstin: null, limit: undefined },
        { name: 'New', city: 'Pune', gstin: null, limit: null },
        ['name', 'city', 'gstin', 'limit'],
      ),
    ).toEqual({ name: { from: 'Old', to: 'New' } })
  })

  test('hides the values of sensitive fields but still flags the change', () => {
    expect(
      diffFields(
        { bankAccountNumber: '', logoUrl: 'data:image/png;base64,AAA' },
        { bankAccountNumber: '123456789', logoUrl: '' },
        ['bankAccountNumber', 'logoUrl'],
        { hidden: ['bankAccountNumber', 'logoUrl'] },
      ),
    ).toEqual({
      bankAccountNumber: { from: '', to: '(hidden)' },
      logoUrl: { from: '(hidden)', to: '' },
    })
  })
})

describe('recordMasterEvent', () => {
  test('stores the label, details and changes in metadata', async () => {
    const audit = new InMemoryAuditLogRepository()

    await recordMasterEvent(audit, {
      companyId,
      actorUserId: userId,
      action: 'party.updated',
      entityType: 'party',
      entityId: 'party-1',
      label: 'Test Customer',
      changes: { city: { from: 'Pune', to: 'Mumbai' } },
    })

    expect(audit.list()).toEqual([
      expect.objectContaining({
        action: 'party.updated',
        metadata: {
          label: 'Test Customer',
          changes: { city: { from: 'Pune', to: 'Mumbai' } },
        },
      }),
    ])
  })

  test('skips an update that changed nothing', async () => {
    const audit = new InMemoryAuditLogRepository()

    const event = await recordMasterEvent(audit, {
      companyId,
      actorUserId: userId,
      action: 'party.updated',
      entityType: 'party',
      entityId: 'party-1',
      label: 'Test Customer',
      changes: {},
    })

    expect(event).toBeNull()
    expect(audit.list()).toEqual([])
  })
})

async function seed() {
  const audit = new InMemoryAuditLogRepository()
  const ledgers = new InMemoryLedgerAccountRepository()
  const repositories: PostingRepositories = {
    invoices: new InMemorySalesInvoiceRepository(),
    bills: new InMemoryPurchaseBillRepository(),
    posting: new InMemoryLedgerPostingRepository(),
    stock: new InMemoryStockStore(),
    items: new InMemoryItemRepository(),
    parties: new InMemoryPartyRepository(),
    dashboard: new InMemoryDashboardSummaryRepository(),
    sequences: new InMemoryDocumentSequenceRepository(),
    audit,
  }
  const accounts = await setupDefaultChartOfAccounts(ledgers, {
    companyId,
    businessType: 'wholesale',
  })
  const byKey = (key: string) =>
    accounts.find((account) => account.systemKey === key)!.id

  const companies = new InMemoryCompanyRepository()
  await companies.create({
    id: companyId,
    accountId: userId,
    legalName: 'Test Traders Private Limited',
    tradeName: 'Test Traders',
    gstin: null,
    stateCode: '27',
    financialYearStart: '2026-04-01',
    businessType: 'wholesale',
    addressLine1: 'Test street',
    addressLine2: '',
    city: 'Pune',
    pincode: '411001',
    pan: '',
    contactPhone: '',
    contactEmail: '',
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    authorizedSignatory: '',
    logoUrl: '',
    invoiceTerms: '',
    createdAt: new Date(),
  })

  const godowns = new InMemoryGodownRepository()
  const transaction = createPostingTransaction(repositories, () => null)
  const users = {
    listByIds: async () => [
      { id: userId, name: 'Test Owner', email: 'owner@example.com' },
      { id: memberUserId, name: 'Test Member', email: 'member@example.com' },
    ],
  }

  const router = createTRPCRouter({
    parties: createPartiesRouter(repositories.parties, audit),
    inventory: createInventoryRouter(
      repositories.items,
      repositories.stock,
      godowns,
      new InMemoryPriceListRepository(),
      ledgers,
      transaction,
      audit,
    ),
    companies: createCompaniesRouter({
      companies,
      ledgers,
      financialYears: new InMemoryFinancialYearRepository(),
      memberships: membershipRepository,
      audit,
      godowns,
    }),
    team: createTeamRouter({
      memberships: membershipRepository,
      invitations: new InMemoryInvitationRepository(),
      companies,
      users,
      audit,
    }),
    imports: createImportsRouter(
      repositories.parties,
      repositories.items,
      ledgers,
      repositories.posting,
      transaction,
      audit,
    ),
  })

  return {
    audit,
    byKey,
    caller: router.createCaller(context),
  }
}

const partyInput = (receivableAccountId: string) => ({
  companyId,
  name: 'Test Customer',
  partyType: 'customer' as const,
  gstin: null,
  stateCode: '27',
  creditLimit: null,
  paymentTermsDays: 30,
  receivableAccountId,
  payableAccountId: null,
  city: 'Pune',
})

const itemInput = {
  companyId,
  name: 'Test Widget',
  hsnCode: '8471',
  gstRate: '18.00',
  baseUnit: 'nos',
  purchaseRate: '100.00',
  saleRate: '150.00',
  tracksInventory: true,
}

const events = (audit: InMemoryAuditLogRepository) =>
  audit.list().map(({ action, actorUserId, entityType, metadata }) => ({
    action,
    actorUserId,
    entityType,
    metadata,
  }))

describe('master and team audit trail', () => {
  beforeEach(async () => {
    resetMembershipRepositoryForTests()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'owner',
      createdAt: new Date(),
    })
  })

  test('records party created and only the fields an update changed', async () => {
    const { audit, byKey, caller } = await seed()

    const party = await caller.parties.create(
      partyInput(byKey('customer_receivable')),
    )
    await caller.parties.update({
      ...partyInput(byKey('customer_receivable')),
      id: party.id,
      city: 'Mumbai',
      paymentTermsDays: 45,
    })

    expect(events(audit)).toEqual([
      {
        action: 'party.created',
        actorUserId: userId,
        entityType: 'party',
        metadata: { label: 'Test Customer' },
      },
      {
        action: 'party.updated',
        actorUserId: userId,
        entityType: 'party',
        metadata: {
          label: 'Test Customer',
          changes: {
            paymentTermsDays: { from: 30, to: 45 },
            city: { from: 'Pune', to: 'Mumbai' },
          },
        },
      },
    ])
  })

  test('records item created, opening stock posted, and item updated', async () => {
    const { audit, caller } = await seed()

    const { item } = await caller.inventory.createItemWithOpening({
      ...itemInput,
      openingQuantity: '10',
      openingOccurredOn: '2026-04-01',
    })
    await caller.inventory.updateItem({
      ...itemInput,
      itemId: item.id,
      saleRate: '160.00',
    })
    await caller.inventory.createItem({ ...itemInput, name: 'Test Gadget' })

    expect(events(audit)).toEqual([
      {
        action: 'item.created',
        actorUserId: userId,
        entityType: 'item',
        metadata: { label: 'Test Widget' },
      },
      {
        action: 'opening_stock.posted',
        actorUserId: userId,
        entityType: 'item',
        metadata: {
          label: 'Test Widget',
          quantity: '10',
          unit: 'nos',
          amount: '1000.00',
        },
      },
      {
        action: 'item.updated',
        actorUserId: userId,
        entityType: 'item',
        metadata: {
          label: 'Test Widget',
          changes: { saleRate: { from: '150.00', to: '160.00' } },
        },
      },
      {
        action: 'item.created',
        actorUserId: userId,
        entityType: 'item',
        metadata: { label: 'Test Gadget' },
      },
    ])
  })

  test('records godown created and renamed', async () => {
    const { audit, caller } = await seed()

    const godown = await caller.inventory.createGodown({
      companyId,
      name: 'Back Store',
    })
    await caller.inventory.updateGodown({
      companyId,
      godownId: godown.id,
      name: 'Rear Store',
    })

    expect(events(audit)).toEqual([
      {
        action: 'godown.created',
        actorUserId: userId,
        entityType: 'godown',
        metadata: { label: 'Back Store' },
      },
      {
        action: 'godown.updated',
        actorUserId: userId,
        entityType: 'godown',
        metadata: {
          label: 'Rear Store',
          changes: { name: { from: 'Back Store', to: 'Rear Store' } },
        },
      },
    ])
  })

  test('records company profile changes without exposing bank details', async () => {
    const { audit, caller } = await seed()

    await caller.companies.updateProfile({
      companyId,
      addressLine1: 'Test street',
      addressLine2: '',
      city: 'Mumbai',
      pincode: '411001',
      pan: '',
      contactPhone: '',
      contactEmail: '',
      bankName: '',
      bankAccountNumber: '000111222',
      bankIfsc: '',
      authorizedSignatory: '',
      logoUrl: '',
      invoiceTerms: '',
    })

    expect(events(audit)).toEqual([
      {
        action: 'company.profile_updated',
        actorUserId: userId,
        entityType: 'company',
        metadata: {
          label: 'Test Traders',
          changes: {
            city: { from: 'Pune', to: 'Mumbai' },
            bankAccountNumber: { from: '', to: '(hidden)' },
          },
        },
      },
    ])
  })

  test('records team invites, role changes and removals', async () => {
    const { audit, caller } = await seed()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId: memberUserId,
      role: 'billing',
      createdAt: new Date(),
    })

    await caller.team.invite({
      companyId,
      email: 'new.person@example.com',
      role: 'accountant',
    })
    await caller.team.updateRole({
      companyId,
      userId: memberUserId,
      role: 'accountant',
    })
    await caller.team.removeMember({ companyId, userId: memberUserId })

    expect(events(audit)).toEqual([
      {
        action: 'team_member.invited',
        actorUserId: userId,
        entityType: 'invitation',
        metadata: { label: 'new.person@example.com', role: 'accountant' },
      },
      {
        action: 'team_member.role_changed',
        actorUserId: userId,
        entityType: 'membership',
        metadata: {
          label: 'Test Member',
          changes: { role: { from: 'billing', to: 'accountant' } },
        },
      },
      {
        action: 'team_member.removed',
        actorUserId: userId,
        entityType: 'membership',
        metadata: { label: 'Test Member', role: 'accountant' },
      },
    ])
  })

  test('records committed imports with row counts', async () => {
    const { audit, byKey, caller } = await seed()

    await caller.imports.commitParties({
      companyId,
      receivableAccountId: byKey('customer_receivable'),
      payableAccountId: byKey('supplier_payable'),
      rows: [
        {
          name: 'Test Buyer',
          partyType: 'customer',
          gstin: null,
          stateCode: '27',
        },
        {
          name: 'Test Vendor',
          partyType: 'supplier',
          gstin: null,
          stateCode: '27',
        },
      ],
    })
    await caller.imports.commitItems({
      companyId,
      rows: [{ name: 'Test Bolt', hsn: '7318', rate: '5', unit: 'nos' }],
    })
    await caller.imports.commitOpeningStock({
      companyId,
      occurredOn: '2026-04-01',
      rows: [{ itemName: 'Test Bolt', quantity: '20', unit: 'nos', rate: '5' }],
    })

    expect(
      audit.list().map(({ action, metadata }) => ({ action, metadata })),
    ).toEqual([
      {
        action: 'party_import.committed',
        metadata: {
          label: 'Parties',
          createdCount: 2,
          skippedCount: 0,
          errorCount: 0,
        },
      },
      {
        action: 'item_import.committed',
        metadata: {
          label: 'Items',
          createdCount: 1,
          skippedCount: 0,
          errorCount: 0,
        },
      },
      {
        action: 'opening_stock_import.committed',
        metadata: {
          label: 'Opening stock',
          createdCount: 1,
          skippedCount: 0,
          errorCount: 0,
        },
      },
    ])
  })
})
