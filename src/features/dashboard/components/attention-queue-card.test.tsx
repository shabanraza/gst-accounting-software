// @vitest-environment jsdom
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { z } from 'zod'

import { AttentionQueueCard } from '#/features/dashboard/components/attention-queue-card.tsx'

import type { AttentionItem } from '#/features/dashboard/attention-queue.ts'

/**
 * Proves the rows actually navigate. The assertions read the `href` the router
 * resolves against real route search schemas, which is what a browser follows.
 */

const receivable: AttentionItem = {
  id: 'overdue-receivable:party-1',
  kind: 'overdue-receivable',
  title: 'Collect from Sharma Traders',
  detail: '3 invoices overdue · oldest 54 days past due',
  amount: '184000.00',
  tone: 'money-in',
  to: '/app/sales',
  search: { party: '11111111-1111-4111-8111-111111111111' },
  score: 70,
  actionable: true,
}

const lowStock: AttentionItem = {
  id: 'low-stock:item-1',
  kind: 'low-stock',
  title: 'Copper Wire 2.5mm is below reorder level',
  detail: '8 in stock · reorder at 25',
  tone: 'inventory',
  to: '/app/inventory',
  search: { item: '22222222-2222-4222-8222-222222222222' },
  score: 44,
  actionable: true,
}

const gst: AttentionItem = {
  id: 'gst-due',
  kind: 'gst-due',
  title: 'GST payable for Jul 2026',
  detail: 'Filing due date not set',
  amount: '58000.00',
  tone: 'gst',
  to: '/app/reports',
  score: 45,
  actionable: true,
}

function renderQueue(items: Array<AttentionItem>) {
  const rootRoute = createRootRoute()
  const stubRoute = (path: string, searchSchema: z.ZodTypeAny) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      validateSearch: searchSchema,
      component: () => null,
    })

  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => (
      <AttentionQueueCard companyName="Test Company" items={items} />
    ),
  })

  const router = createRouter({
    history: createMemoryHistory({ initialEntries: ['/'] }),
    routeTree: rootRoute.addChildren([
      indexRoute,
      stubRoute(
        '/app/sales',
        z.object({ party: z.string().uuid().optional().catch(undefined) }),
      ),
      stubRoute(
        '/app/purchases',
        z.object({ party: z.string().uuid().optional().catch(undefined) }),
      ),
      stubRoute(
        '/app/inventory',
        z.object({ item: z.string().uuid().optional().catch(undefined) }),
      ),
      stubRoute(
        '/app/reports',
        z.object({ tab: z.string().optional().catch(undefined) }),
      ),
      stubRoute(
        '/app/payments',
        z.object({ mode: z.string().optional().catch(undefined) }),
      ),
      stubRoute('/app/purchase-orders', z.object({})),
    ]),
  })

  const { container } = render(<RouterProvider router={router} />)
  return container
}

/** The href the browser would follow for the single rendered row. */
async function rowHref(item: AttentionItem) {
  const container = renderQueue([item])
  const links = await waitFor(() => {
    const found = container.querySelectorAll('a[data-row-link]')
    expect(found).toHaveLength(1)
    return found
  })
  return links[0].getAttribute('href')
}

describe('AttentionQueueCard links', () => {
  afterEach(cleanup)

  test('sends an overdue receivable to the sales register filtered by party', async () => {
    expect(await rowHref(receivable)).toBe(
      '/app/sales?party=11111111-1111-4111-8111-111111111111',
    )
  })

  test('sends a low stock row to inventory filtered by item', async () => {
    expect(await rowHref(lowStock)).toBe(
      '/app/inventory?item=22222222-2222-4222-8222-222222222222',
    )
  })

  test('leaves a paramless row with a bare pathname', async () => {
    expect(await rowHref(gst)).toBe('/app/reports')
  })
})

/** The row's action buttons, as label → href. */
async function rowActions(item: AttentionItem) {
  const container = renderQueue([item])
  await waitFor(() => {
    expect(container.querySelectorAll('[data-attention-row]')).toHaveLength(1)
  })
  return Object.fromEntries(
    [...container.querySelectorAll('a[data-row-action]')].map((link) => [
      link.textContent.trim(),
      link.getAttribute('href'),
    ]),
  )
}

describe('AttentionQueueCard actions', () => {
  afterEach(cleanup)

  test('offers a WhatsApp reminder and a receipt for an overdue customer with a mobile', async () => {
    const actions = await rowActions({ ...receivable, contactPhone: '98765 43210' })

    expect(actions.Remind).toMatch(/^https:\/\/wa\.me\/919876543210\?text=/)
    expect(actions.Remind).toContain(encodeURIComponent('Test Company'))
    expect(actions.Receipt).toBe('/app/payments?mode=receipts')
  })

  test('skips the reminder when the customer has no mobile number', async () => {
    const actions = await rowActions(receivable)

    expect(actions.Remind).toBeUndefined()
    expect(actions.Receipt).toBe('/app/payments?mode=receipts')
  })

  test('opens the right screen for payables, low stock and GST', async () => {
    expect(
      await rowActions({
        ...receivable,
        id: 'overdue-payable:party-2',
        kind: 'overdue-payable',
        to: '/app/purchases',
      }),
    ).toEqual({ Pay: '/app/payments?mode=payments' })
    expect(await rowActions(lowStock)).toEqual({ Reorder: '/app/purchase-orders' })
    expect(await rowActions(gst)).toEqual({ 'GSTR-3B': '/app/reports?tab=gstr3b' })
  })

  test('shows no actions on a row the caller cannot act on', async () => {
    expect(await rowActions({ ...receivable, actionable: false })).toEqual({})
  })
})
