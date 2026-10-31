import { describe, expect, test, vi } from 'vitest'

import {
  ASSISTANT_MODEL,
  AssistantUnavailableError,
  FREE_QUOTA_USED_MESSAGE,
  runAssistantConversation,
} from '#/features/assistant/assistant-service.ts'

import type { AiBinding } from '#/features/assistant/assistant-service.ts'
import type { AssistantToolset } from '#/features/assistant/assistant-tools.ts'

function fakeTools(
  run: AssistantToolset['run'] = async () => ({
    data: { netGstPayable: '90.00' },
    link: { label: 'GSTR-3B', href: '/app/reports?tab=gstr3b' },
  }),
): AssistantToolset {
  return {
    definitions: [
      { name: 'gstr3b_summary', description: 'GST', parameters: {} },
    ],
    run: vi.fn(run),
  }
}

function fakeAi(...outputs: Array<unknown>) {
  const run = vi.fn<AiBinding['run']>()
  for (const output of outputs) run.mockResolvedValueOnce(output)
  return { run }
}

const context = {
  companyId: '11111111-1111-4111-8111-111111111111',
  companyStateCode: '27',
}

const ask = (ai: AiBinding, tools = fakeTools(), history = []) =>
  runAssistantConversation({
    ai,
    tools,
    question: 'GST payable this month?',
    history,
    context,
    today: '2026-10-31',
  })

describe('runAssistantConversation', () => {
  test('runs a tool with the server company and answers with links', async () => {
    const ai = fakeAi(
      {
        tool_calls: [
          {
            name: 'gstr3b_summary',
            arguments: { periodStart: '2026-10-01', periodEnd: '2026-10-31' },
          },
        ],
      },
      { response: 'Net GST payable is ₹90.00.' },
    )
    const tools = fakeTools()

    const result = await ask(ai, tools)

    expect(result).toEqual({
      answer: 'Net GST payable is ₹90.00.',
      links: [{ label: 'GSTR-3B', href: '/app/reports?tab=gstr3b' }],
    })
    expect(tools.run).toHaveBeenCalledWith(
      'gstr3b_summary',
      { periodStart: '2026-10-01', periodEnd: '2026-10-31' },
      context,
    )
    const [model, firstInput] = ai.run.mock.calls[0]
    expect(model).toBe(ASSISTANT_MODEL)
    expect(JSON.stringify(firstInput)).toContain('2026-10-31')
    expect(JSON.stringify(firstInput)).not.toContain(context.companyId)
    const secondMessages = ai.run.mock.calls[1][1].messages as Array<unknown>
    expect(secondMessages.at(-1)).toEqual({
      role: 'tool',
      name: 'gstr3b_summary',
      content: JSON.stringify({ netGstPayable: '90.00' }),
    })
  })

  test('accepts OpenAI-style tool calls with string arguments', async () => {
    const ai = fakeAi(
      {
        // Workers AI also adds a normalised copy without ids at the top level.
        tool_calls: [
          { name: 'gstr3b_summary', arguments: { periodStart: '2026-10-01' } },
        ],
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call-1',
                  type: 'function',
                  function: {
                    name: 'gstr3b_summary',
                    arguments: '{"periodStart":"2026-10-01"}',
                  },
                },
              ],
            },
          },
        ],
      },
      { choices: [{ message: { content: 'done' } }] },
    )
    const tools = fakeTools()
    expect((await ask(ai, tools)).answer).toBe('done')
    expect(tools.run).toHaveBeenCalledWith(
      'gstr3b_summary',
      { periodStart: '2026-10-01' },
      context,
    )
    // The model must see its own call and the matching result, or it repeats it.
    expect(
      (ai.run.mock.calls[1][1].messages as Array<unknown>).slice(-2),
    ).toEqual([
      {
        role: 'assistant',
        content: '',
        tool_calls: [
          {
            id: 'call-1',
            type: 'function',
            function: {
              name: 'gstr3b_summary',
              arguments: '{"periodStart":"2026-10-01"}',
            },
          },
        ],
      },
      {
        role: 'tool',
        tool_call_id: 'call-1',
        name: 'gstr3b_summary',
        content: JSON.stringify({ netGstPayable: '90.00' }),
      },
    ])
  })

  test('reports tool failures back to the model', async () => {
    const ai = fakeAi(
      { tool_calls: [{ name: 'run_sql', arguments: {} }] },
      { response: 'I cannot do that.' },
    )
    const result = await ask(
      ai,
      fakeTools(async () => {
        throw new Error('Unknown tool: run_sql')
      }),
    )
    expect(result.links).toEqual([])
    expect((ai.run.mock.calls[1][1].messages as Array<unknown>).at(-1)).toEqual(
      {
        role: 'tool',
        name: 'run_sql',
        content: 'Error: Unknown tool: run_sql',
      },
    )
  })

  test('maps the free daily allocation error to a friendly message', async () => {
    const ai = {
      run: vi
        .fn()
        .mockRejectedValue(
          new Error(
            '3036: You have used up your daily free allocation of 10,000 neurons.',
          ),
        ),
    }
    const error = await ask(ai).catch((caught: unknown) => caught)
    expect(error).toBeInstanceOf(AssistantUnavailableError)
    expect((error as Error).message).toBe(FREE_QUOTA_USED_MESSAGE)
  })

  test('stops after the turn limit', async () => {
    const ai = {
      run: vi.fn().mockResolvedValue({
        tool_calls: [{ name: 'gstr3b_summary', arguments: {} }],
      }),
    }
    const result = await ask(ai)
    expect(ai.run).toHaveBeenCalledTimes(4)
    expect(result.answer).toMatch(/couldn't finish/i)
  })

  test('passes earlier turns as history after the system prompt', async () => {
    const ai = fakeAi({ response: 'ok' })
    await runAssistantConversation({
      ai,
      tools: fakeTools(),
      question: 'and last month?',
      history: [
        { role: 'user', content: 'GST this month?' },
        { role: 'assistant', content: '₹90' },
      ],
      context,
      today: '2026-10-31',
    })
    expect(
      (ai.run.mock.calls[0][1].messages as Array<unknown>).slice(1),
    ).toEqual([
      { role: 'user', content: 'GST this month?' },
      { role: 'assistant', content: '₹90' },
      { role: 'user', content: 'and last month?' },
    ])
  })
})
