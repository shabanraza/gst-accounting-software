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

import type { CreateMessage } from '#/features/assistant/assistant-service.ts'
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
  apiKey: string | undefined,
  createMessage?: CreateMessage,
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
      getApiKey: () => apiKey,
      createMessage: createMessage && (() => createMessage),
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

describe('assistant router', () => {
  beforeEach(() => resetMembershipRepositoryForTests())

  test('status reports whether the key is set without exposing it', async () => {
    const { userId } = await member('owner')
    expect(await createCaller(userId, undefined).assistant.status()).toEqual({
      configured: false,
    })
    expect(await createCaller(userId, 'sk-test').assistant.status()).toEqual({
      configured: true,
    })
  })

  test('ask fails with PRECONDITION_FAILED when the key is missing', async () => {
    const { userId, companyId } = await member('owner')
    await expect(
      createCaller(userId, undefined).assistant.ask(question(companyId)),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' })
  })

  test('ask requires view_reports on the company', async () => {
    const { userId, companyId } = await member('billing')
    const createMessage = vi.fn()
    await expect(
      createCaller(userId, 'sk-test', createMessage).assistant.ask(
        question(companyId),
      ),
    ).rejects.toThrow()
    expect(createMessage).not.toHaveBeenCalled()
  })

  test('ask returns the model answer', async () => {
    const { userId, companyId } = await member('owner')
    const createMessage = vi.fn().mockResolvedValue({
      content: [{ type: 'text', text: 'Cash is ₹0.00.' }],
      stop_reason: 'end_turn',
    })
    const result = await createCaller(
      userId,
      'sk-test',
      createMessage,
    ).assistant.ask(question(companyId))
    expect(result).toEqual({ answer: 'Cash is ₹0.00.', links: [] })
  })
})
