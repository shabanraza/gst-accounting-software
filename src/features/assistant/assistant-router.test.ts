import { beforeEach, describe, expect, test, vi } from 'vitest'

import { InMemoryLedgerAccountRepository } from '#/features/accounting/ledger-account-store.ts'
import { InMemoryLedgerPostingRepository } from '#/features/accounting/ledger-posting-store.ts'
import { createAssistantRouter } from '#/features/assistant/assistant-router.ts'
import {
  membershipRepository,
  resetMembershipRepositoryForTests,
} from '#/features/companies/membership-store.ts'
import {
  InMemoryItemRepository,
  InMemoryStockStore,
} from '#/features/inventory/inventory-store.ts'
import { InMemoryPartyRepository } from '#/features/parties/party-store.ts'
import { InMemoryPurchaseBillRepository } from '#/features/purchases/purchase-bill-store.ts'
import { InMemoryCreditDebitNoteRepository } from '#/features/returns/credit-debit-note-store.ts'
import { InMemorySalesInvoiceRepository } from '#/features/sales/sales-invoice-store.ts'
import { createTRPCRouter } from '#/integrations/trpc/init.ts'

import { InMemoryAssistantUsageRepository } from '#/features/assistant/assistant-usage-store.ts'
import {
  ASSISTANT_DAILY_LIMIT,
  DAILY_LIMIT_MESSAGE,
  FREE_QUOTA_USED_MESSAGE,
} from '#/features/assistant/assistant-service.ts'

import type { AiBinding } from '#/features/assistant/assistant-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

const testContext = (userId: string): TRPCContext => ({
  session: {
    user: { id: userId, email: 'user@example.com', name: 'Test User' },
    session: { id: crypto.randomUUID(), userId },
  },
  request: new Request('http://localhost/api/trpc'),
})

function createCaller(
  userId: string,
  ai: AiBinding | undefined,
  usage = new InMemoryAssistantUsageRepository(),
) {
  const stock = new InMemoryStockStore()
  const router = createTRPCRouter({
    assistant: createAssistantRouter({
      parties: new InMemoryPartyRepository(),
      invoices: new InMemorySalesInvoiceRepository(),
      bills: new InMemoryPurchaseBillRepository(),
      notes: new InMemoryCreditDebitNoteRepository(),
      items: new InMemoryItemRepository(),
      stockBalances: stock,
      ledgers: new InMemoryLedgerAccountRepository(),
      postings: new InMemoryLedgerPostingRepository(),
      usage,
      getAi: async () => ai,
    }),
  })
  return router.createCaller(testContext(userId))
}

async function member(role: 'owner' | 'billing') {
  const userId = crypto.randomUUID()
  const companyId = crypto.randomUUID()
  await membershipRepository.create({
    id: crypto.randomUUID(),
    companyId,
    userId,
    role,
    createdAt: new Date(),
  })
  return { userId, companyId }
}

const question = (companyId: string) => ({
  companyId,
  companyStateCode: '27',
  question: 'Cash balance?',
})

const answering = (text: string) => ({
  run: vi.fn<AiBinding['run']>().mockResolvedValue({ response: text }),
})

describe('assistant router', () => {
  beforeEach(() => resetMembershipRepositoryForTests())

  test('status reports whether the AI binding is available', async () => {
    const { userId } = await member('owner')
    expect(await createCaller(userId, undefined).assistant.status()).toEqual({
      configured: false,
      dailyLimit: ASSISTANT_DAILY_LIMIT,
    })
    expect(
      await createCaller(userId, answering('x')).assistant.status(),
    ).toEqual({ configured: true, dailyLimit: ASSISTANT_DAILY_LIMIT })
  })

  test('ask fails with PRECONDITION_FAILED without the AI binding', async () => {
    const { userId, companyId } = await member('owner')
    await expect(
      createCaller(userId, undefined).assistant.ask(question(companyId)),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
  })

  test('ask requires view_reports on the company', async () => {
    const { userId, companyId } = await member('billing')
    const ai = answering('x')
    await expect(
      createCaller(userId, ai).assistant.ask(question(companyId)),
    ).rejects.toThrow()
    expect(ai.run).not.toHaveBeenCalled()
  })

  test('ask returns the model answer', async () => {
    const { userId, companyId } = await member('owner')
    const result = await createCaller(
      userId,
      answering('Cash is ₹0.00.'),
    ).assistant.ask(question(companyId))
    expect(result).toEqual({ answer: 'Cash is ₹0.00.', links: [] })
  })

  test('stops a company at the daily question limit', async () => {
    const { userId, companyId } = await member('owner')
    const ai = answering('ok')
    const caller = createCaller(userId, ai)
    for (let index = 0; index < ASSISTANT_DAILY_LIMIT; index++) {
      await caller.assistant.ask(question(companyId))
    }
    await expect(caller.assistant.ask(question(companyId))).rejects.toMatchObject(
      { code: 'TOO_MANY_REQUESTS', message: DAILY_LIMIT_MESSAGE },
    )
    expect(ai.run).toHaveBeenCalledTimes(ASSISTANT_DAILY_LIMIT)
  })

  test('shows the friendly message when the free daily allowance is used up', async () => {
    const { userId, companyId } = await member('owner')
    const ai = {
      run: vi
        .fn()
        .mockRejectedValue(
          new Error('AiError: 3036: daily free allocation of 10,000 neurons'),
        ),
    }
    await expect(
      createCaller(userId, ai).assistant.ask(question(companyId)),
    ).rejects.toMatchObject({
      code: 'TOO_MANY_REQUESTS',
      message: FREE_QUOTA_USED_MESSAGE,
    })
  })
})
