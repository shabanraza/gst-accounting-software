import type Anthropic from '@anthropic-ai/sdk'
import type {
  AssistantLink,
  AssistantToolContext,
  AssistantToolset,
} from '#/features/assistant/assistant-tools.ts'

export const ASSISTANT_MODEL = 'claude-sonnet-5-5'
const MAX_TURNS = 6

const SYSTEM_PROMPT = `You answer questions about one Indian business's own accounting books in HisaabKro (GST billing and accounting software).

- Use the tools to get figures; never guess or invent numbers. If the tools cannot answer, say so briefly.
- You can only read data. If asked to create, change, post or delete anything, explain that you can only answer questions.
- Reply in the user's language and script (Hindi, Hinglish or English).
- Keep answers short: lead with the figure, in rupees with Indian digit grouping (for example ₹1,25,000.00), then one line of context if useful. Write plain text without markdown.
- Indian financial years run 1 April to 31 March. "This month" means the calendar month of today's date.`

export type AssistantHistoryTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type CreateMessage = (
  params: Anthropic.Beta.MessageCreateParamsNonStreaming,
) => Promise<Anthropic.Beta.BetaMessage>

export type AssistantAnswer = {
  answer: string
  links: Array<AssistantLink>
}

export async function runAssistantConversation(input: {
  createMessage: CreateMessage
  tools: AssistantToolset
  question: string
  history: Array<AssistantHistoryTurn>
  context: AssistantToolContext
  /** Today's date (YYYY-MM-DD) in the business's timezone. */
  today: string
}): Promise<AssistantAnswer> {
  const messages: Array<Anthropic.Beta.BetaMessageParam> = [
    ...input.history.map((turn) => ({ role: turn.role, content: turn.content })),
    { role: 'user', content: input.question },
  ]
  const links = new Map<string, AssistantLink>()

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await input.createMessage({
      model: ASSISTANT_MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          cache_control: { type: 'ephemeral' },
        },
        { type: 'text', text: `Today is ${input.today}.` },
      ],
      tools: input.tools.definitions,
      messages,
    })

    if (response.stop_reason === 'refusal') {
      return {
        answer: "Sorry, I can't help with that question.",
        links: [...links.values()],
      }
    }

    const toolUses = response.content.filter(
      (block): block is Anthropic.Beta.BetaToolUseBlock =>
        block.type === 'tool_use',
    )
    if (response.stop_reason !== 'tool_use' || toolUses.length === 0) {
      const answer = response.content
        .filter(
          (block): block is Anthropic.Beta.BetaTextBlock =>
            block.type === 'text',
        )
        .map((block) => block.text)
        .join('\n')
        .trim()
      return { answer, links: [...links.values()] }
    }

    messages.push({ role: 'assistant', content: response.content })
    const results = await Promise.all(
      toolUses.map(
        async (block): Promise<Anthropic.Beta.BetaToolResultBlockParam> => {
          try {
            const result = await input.tools.run(
              block.name,
              block.input,
              input.context,
            )
            links.set(result.link.href, result.link)
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: JSON.stringify(result.data),
            }
          } catch (error) {
            return {
              type: 'tool_result',
              tool_use_id: block.id,
              content: error instanceof Error ? error.message : 'Tool failed',
              is_error: true,
            }
          }
        },
      ),
    )
    messages.push({ role: 'user', content: results })
  }

  return {
    answer: "Sorry, I couldn't finish answering that. Try a narrower question.",
    links: [...links.values()],
  }
}
