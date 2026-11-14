import { beforeEach, describe, expect, test } from 'vitest'

import { InMemoryCompanyRepository } from '#/features/companies/company-store.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import {
  shareTokenExpiry,
  signShareToken,
} from '#/features/documents/invoice-share-token.ts'
import { createFixedWindowRateLimiter } from '#/features/documents/public-rate-limit.ts'
import { InMemoryItemRepository } from '#/features/inventory/inventory-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { createSalesRouter } from '#/features/sales/sales-router.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import type { CompanyRecord } from '#/features/companies/company-service.ts'
import type { PartyRecord } from '#/features/parties/party-service.ts'
import type { SalesInvoiceRecord } from '#/features/sales/sales-invoice-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const secret = 'router-test-secret-at-least-32-characters'

const anonymousContext = (ip = '203.0.113.7'): TRPCContext => ({
  session: null,
  request: new Request('https://hisaabkro.in/api/trpc', {
    headers: { 'cf-connecting-ip': ip },
  }),
})

const memberContext = (userId: string): TRPCContext => ({
  session: {
    user: { id: userId, email: 'owner@example.com', name: 'Owner' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('https://hisaabkro.in/api/trpc'),
})

function makeCompany(id: string, overrides: Partial<CompanyRecord> = {}) {
  return {
    id,
    accountId: 'account-1',
    legalName: 'Shaban Textiles Private Limited',
    tradeName: 'Shaban Textiles',
    gstin: null,
    stateCode: '27',
    financialYearStart: '2026-04-01',
    businessType: 'wholesale',
    addressLine1: 'Shop 4, Station Road',
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
    upiId: 'shaban@okhdfc',
    createdAt: new Date('2026-04-01'),
    ...overrides,
  } satisfies CompanyRecord
}

function makeParty(id: string, companyId: string): PartyRecord {
  return {
    id,
    companyId,
    name: 'Noor Retailers',
    partyType: 'customer',
    gstin: null,
    stateCode: '27',
    creditLimit: null,
    paymentTermsDays: 0,
    receivableAccountId: null,
    payableAccountId: null,
    createdAt: new Date('2026-04-01'),
  }
}

function makeInvoice(
  id: string,
  companyId: string,
  customerId: string,
  overrides: Partial<SalesInvoiceRecord> = {},
): SalesInvoiceRecord {
  return {
    id,
    companyId,
    customerId,
    invoiceNumber: 'INV/0007',
    invoiceDate: '2026-11-01',
    placeOfSupply: '27',
    reverseCharge: false,
    paymentMode: 'credit',
    paymentStatus: 'Part paid',
    taxMode: 'exclusive',
    narration: '',
    freight: '0.00',
    packing: '0.00',
    roundOff: '0.00',
    billDiscount: '0.00',
    godownName: null,
    dueDate: '',
    poReference: '',
    transportMode: '',
    vehicleNo: '',
    lrNumber: '',
    challanRef: '',
    status: 'posted',
    taxableAmount: '1000.00',
    totalGstAmount: '0.00',
    totalAmount: '1000.00',
    outstandingAmount: '400.00',
    ledgerEntryId: crypto.randomUUID(),
    lines: [],
    createdAt: new Date('2026-11-01'),
    partyNameSnapshot: 'Noor Retailers',
    partyGstinSnapshot: null,
    partyPanSnapshot: '',
    partyBillingAddressSnapshot: '',
    partyShippingAddressSnapshot: '',
    partyStateCodeSnapshot: '27',
    partyPhoneSnapshot: '',
    partyEmailSnapshot: '',
    ...overrides,
  }
}

async function setup(options: { secret?: string; limit?: number } = {}) {
  const invoices = new InMemorySalesInvoiceRepository()
  const companies = new InMemoryCompanyRepository()
  const parties = new InMemoryPartyRepository()
  const items = new InMemoryItemRepository()

  const companyId = crypto.randomUUID()
  const otherCompanyId = crypto.randomUUID()
  const customerId = crypto.randomUUID()
  const invoiceId = crypto.randomUUID()
  const otherInvoiceId = crypto.randomUUID()

  await companies.create(makeCompany(companyId))
  await companies.create(
    makeCompany(otherCompanyId, { legalName: 'Other Co', upiId: 'other@ybl' }),
  )
  await parties.create(makeParty(customerId, companyId))
  await invoices.create(makeInvoice(invoiceId, companyId, customerId))
  await invoices.create(
    makeInvoice(otherInvoiceId, otherCompanyId, customerId, {
      invoiceNumber: 'OTHER/1',
    }),
  )

  const router = createTRPCRouter({
    sales: createSalesRouter(
      invoices,
      () => {
        throw new Error('not used')
      },
      {
        companies,
        parties,
        items,
        getSecret: () => ('secret' in options ? options.secret : secret),
        rateLimiter: createFixedWindowRateLimiter({
          limit: options.limit ?? 100,
          windowMs: 60_000,
        }),
      },
    ),
  })

  return {
    router,
    invoices,
    companyId,
    otherCompanyId,
    customerId,
    invoiceId,
    otherInvoiceId,
  }
}

function tokenFor(companyId: string, invoiceId: string, expiresAt?: Date) {
  return signShareToken(
    { companyId, invoiceId, expiresAt: expiresAt ?? shareTokenExpiry() },
    secret,
  )
}

describe('sales.publicInvoice', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })

  test('returns the print document for a valid link without a session', async () => {
    const { router, companyId, invoiceId } = await setup()
    const caller = router.createCaller(anonymousContext())

    const result = await caller.sales.publicInvoice({
      token: await tokenFor(companyId, invoiceId),
    })

    expect(result.status).toBe('active')
    if (result.status !== 'active') return
    expect(result.document.documentNumber).toBe('INV/0007')
    expect(result.document.company.legalName).toBe(
      'Shaban Textiles Private Limited',
    )
    expect(result.document.upiUri).toBe(
      'upi://pay?pa=shaban@okhdfc&pn=Shaban%20Textiles&am=400.00&cu=INR&tn=INV%2F0007',
    )
    // Only the print model goes out: no account ids or raw company rows.
    expect(JSON.stringify(result)).not.toContain('account-1')
    expect(result.document.company).not.toHaveProperty('accountId')
  })

  test('rejects a tampered, forged or expired token with a generic not found', async () => {
    const { router, companyId, invoiceId } = await setup()
    const caller = router.createCaller(anonymousContext())
    const valid = await tokenFor(companyId, invoiceId)
    const tampered = `${valid.slice(0, 20)}${valid[20] === 'A' ? 'B' : 'A'}${valid.slice(21)}`
    const forged = await signShareToken(
      { companyId, invoiceId, expiresAt: shareTokenExpiry() },
      'attacker-guess-secret-of-32-characters!!',
    )
    const expired = await tokenFor(
      companyId,
      invoiceId,
      new Date(Date.now() - 1000),
    )

    for (const token of [tampered, forged, expired, 'not-a-token', '']) {
      await expect(caller.sales.publicInvoice({ token })).rejects.toMatchObject(
        { code: 'NOT_FOUND' },
      )
    }
  })

  test('does not serve an invoice under another company id', async () => {
    const { router, companyId, otherInvoiceId } = await setup()
    const caller = router.createCaller(anonymousContext())

    // Validly signed, but the invoice belongs to a different company.
    await expect(
      caller.sales.publicInvoice({
        token: await tokenFor(companyId, otherInvoiceId),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('returns only a cancelled flag once the invoice is cancelled', async () => {
    const { router, invoices, companyId, invoiceId } = await setup()
    const caller = router.createCaller(anonymousContext())
    const token = await tokenFor(companyId, invoiceId)

    const invoice = await invoices.findById(invoiceId)
    await invoices.save({ ...invoice!, status: 'cancelled' })

    await expect(caller.sales.publicInvoice({ token })).resolves.toEqual({
      status: 'cancelled',
    })
  })

  test('serves nothing when the server secret is not configured', async () => {
    const { router, companyId, invoiceId } = await setup({
      secret: undefined,
    })
    const caller = router.createCaller(anonymousContext())

    await expect(
      caller.sales.publicInvoice({
        token: await tokenFor(companyId, invoiceId),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  test('rate-limits each client IP', async () => {
    const { router, companyId, invoiceId } = await setup({ limit: 2 })
    const token = await tokenFor(companyId, invoiceId)
    const caller = router.createCaller(anonymousContext('198.51.100.1'))

    await caller.sales.publicInvoice({ token })
    await caller.sales.publicInvoice({ token })
    await expect(caller.sales.publicInvoice({ token })).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
    })

    const otherClient = router.createCaller(anonymousContext('198.51.100.2'))
    await expect(
      otherClient.sales.publicInvoice({ token }),
    ).resolves.toMatchObject({ status: 'active' })
  })
})

describe('sales.shareLink', () => {
  beforeEach(() => {
    resetMembershipRepositoryForTests()
  })

  async function memberCaller(
    router: Awaited<ReturnType<typeof setup>>['router'],
    companyId: string,
  ) {
    const userId = crypto.randomUUID()
    await membershipRepository.create({
      id: crypto.randomUUID(),
      companyId,
      userId,
      role: 'readonly',
      createdAt: new Date(),
    })
    return router.createCaller(memberContext(userId))
  }

  test('issues a /i/ link that opens the same invoice publicly', async () => {
    const { router, companyId, invoiceId } = await setup()
    const caller = await memberCaller(router, companyId)

    const link = await caller.sales.shareLink({ companyId, id: invoiceId })

    expect(link.path).toMatch(/^\/i\/[A-Za-z0-9_-]{92}$/)
    const result = await router
      .createCaller(anonymousContext())
      .sales.publicInvoice({ token: link.path.slice(3) })
    expect(result.status).toBe('active')
  })

  test('refuses invoices from another company and cancelled invoices', async () => {
    const { router, invoices, companyId, invoiceId, otherInvoiceId } =
      await setup()
    const caller = await memberCaller(router, companyId)

    await expect(
      caller.sales.shareLink({ companyId, id: otherInvoiceId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })

    const invoice = await invoices.findById(invoiceId)
    await invoices.save({ ...invoice!, status: 'cancelled' })
    await expect(
      caller.sales.shareLink({ companyId, id: invoiceId }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  })

  test('requires company membership', async () => {
    const { router, companyId, invoiceId } = await setup()
    const outsider = router.createCaller(memberContext(crypto.randomUUID()))

    await expect(
      outsider.sales.shareLink({ companyId, id: invoiceId }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
