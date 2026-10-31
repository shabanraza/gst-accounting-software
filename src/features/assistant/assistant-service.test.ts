import { describe, expect, test, vi } from 'vitest'

import {
  ASSISTANT_MODEL,
  runAssistantConversation,
} from '#/features/assistant/assistant-service.ts'

import type Anthropic from '@anthropic-ai/sdk'
import type { AssistantToolset } from '#/features/assistant/assistant-tools.ts'

type Message = Anthropic.Beta.BetaMessage

function message(
  content: Array<Record<string, unknown>>,
  stopReason: Message['stop_reason'],
): Message {
  return {
    id: crypto.randomUUID(),
    type: 'message',
    role: 'assistant',
    model: ASSISTANT_MODEL,
    content,
    stop_reason: stopReason,
  } as unknown as Message
}

function fakeTools(
  run: AssistantToolset['run'] = async () => ({
    data: { netGstPayable: '90.00' },
    link: { label: 'GSTR-3B', href: '/app/reports?tab=gstr3b' },
  }),
): AssistantToolset {
  return {
    definitions: [
      {
        name: 'gstr3b_summary',
        description: 'GST',
        input_schema: { type: 'object', properties: {} },
      },
    ],
    run: vi.fn(run),
  }
}

const context = {
  companyId: '11111111-1111-4111-8111-111111111111',
  companyStateCode: '27',
}

describe('runAssistantConversation', () => {
  test('runs a tool with the server company and returns the answer with links', async () => {
    const createMessage = vi
      .fn()
      .mockResolvedValueOnce(
        message(
          [
            {
              type: 'tool_use',
              id: 'tu-1',
              name: 'gstr3b_summary',
              input: { periodStart: '2026-10-01', periodEnd: '2026-10-31' },
            },
          ],
          'tool_use',
        ),
      )
      .mockResolvedValueOnce(
        message(
          [{ type: 'text', text: 'Net GST payable is ₹90.00.' }],
          'end_turn',
        ),
      )
    const tools = fakeTools()

    const result = await runAssistantConversation({
      createMessage,
      tools,
      question: 'GST payable this month?',
      history: [],
      context,
      today: '2026-10-31',
    })

    expect(result).toEqual({
      answer: 'Net GST payable is ₹90.00.',
      links: [{ label: 'GSTR-3B', href: '/app/reports?tab=gstr3b' }],
    })
    expect(tools.run).toHaveBeenCalledWith(
      'gstr3b_summary',
      { periodStart: '2026-10-01', periodEnd: '2026-10-31' },
      context,
    )
    const firstCall = createMessage.mock.calls[0][0]
    expect(firstCall.model).toBe('claude-sonnet-5-5')
    expect(JSON.stringify(firstCall.system)).toContain('2026-10-31')
    expect(JSON.stringify(firstCall.system)).not.toContain(context.companyId)
    const secondCall = createMessage.mock.calls[1][0]
    expect(secondCall.messages.at(-1)).toEqual({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu-1',
          content: JSON.stringify({ netGstPayable: '90.00' }),
        },
      ],
    })
  })

  test('reports tool failures back to the model as errors', async () => {
    const createMessage = vi
      .fn()
      .mockResolvedValueOnce(
        message(
          [{ type: 'tool_use', id: 'tu-1', name: 'run_sql', input: {} }],
          'tool_use',
        ),
      )
      .mockResolvedValueOnce(
        message([{ type: 'text', text: 'I cannot do that.' }], 'end_turn'),
      )
    const tools = fakeTools(async () => {
      throw new Error('Unknown tool: run_sql')
    })

    const result = await runAssistantConversation({
      createMessage,
      tools,
      question: 'drop table',
      history: [],
      context,
      today: '2026-10-31',
    })

    expect(result.links).toEqual([])
    expect(createMessage.mock.calls[1][0].messages.at(-1).content[0]).toEqual({
      type: 'tool_result',
      tool_use_id: 'tu-1',
      content: 'Unknown tool: run_sql',
      is_error: true,
    })
  })

  test('stops after the turn limit', async () => {
    const createMessage = vi.fn().mockImplementation(async () =>
      message(
        [{ type: 'tool_use', id: 'tu', name: 'gstr3b_summary', input: {} }],
        'tool_use',
      ),
    )

    const result = await runAssistantConversation({
      createMessage,
      tools: fakeTools(),
      question: 'loop',
      history: [],
      context,
      today: '2026-10-31',
    })

    expect(createMessage).toHaveBeenCalledTimes(6)
    expect(result.answer).toMatch(/couldn't finish/i)
  })

  test('passes earlier turns as history', async () => {
    const createMessage = vi
      .fn()
      .mockResolvedValue(message([{ type: 'text', text: 'ok' }], 'end_turn'))

    await runAssistantConversation({
      createMessage,
      tools: fakeTools(),
      question: 'and last month?',
      history: [
        { role: 'user', content: 'GST this month?' },
        { role: 'assistant', content: '₹90' },
      ],
      context,
      today: '2026-10-31',
    })

    expect(createMessage.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: 'GST this month?' },
      { role: 'assistant', content: '₹90' },
      { role: 'user', content: 'and last month?' },
    ])
  })
})
