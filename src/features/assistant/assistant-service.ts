import type {
  AssistantLink,
  AssistantToolContext,
  AssistantToolset,
} from '#/features/assistant/assistant-tools.ts'

/** Workers AI model; any function-calling text model can be swapped in here. */
export const ASSISTANT_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
/** Questions per company per day (IST), to keep within the free Neuron allowance. */
export const ASSISTANT_DAILY_LIMIT = 20
const MAX_TURNS = 4

export const FREE_QUOTA_USED_MESSAGE =
  "Today's free AI questions are used up. Please try again tomorrow."
export const DAILY_LIMIT_MESSAGE =
  "You've asked today's limit of questions for this company. Please try again tomorrow."
export const AI_BUSY_MESSAGE =
  'The assistant is busy right now. Please try again in a minute.'

const SYSTEM_PROMPT = `You answer questions about one Indian business's own accounting books in HisaabKro (GST billing and accounting software).
- Use the tools to get figures; never guess or invent numbers. If the tools cannot answer, say so briefly.
- You can only read data. If asked to create, change, post or delete anything, say you can only answer questions.
- Reply in the user's language and script (Hindi, Hinglish or English).
- Keep answers short: lead with the figure in rupees with Indian digit grouping (for example ₹1,25,000.00), then at most one line of context. Plain text, no markdown.
- A negative net GST payable means input tax credit exceeds output GST: say there is no GST to pay and give the credit amount.
- Indian financial years run 1 April to 31 March. "This month" means the calendar month of today's date.`

/** The slice of the Workers AI binding (`env.AI`) this feature uses. */
export type AiBinding = {
  run: (model: string, input: Record<string, unknown>) => Promise<unknown>
}

export type AssistantHistoryTurn = {
  role: 'user' | 'assistant'
  content: string
}

export type AssistantAnswer = {
  answer: string
  links: Array<AssistantLink>
}

type ToolCall = {
  /** Present on OpenAI-style output; results must then echo it back. */
  id?: string
  name: string
  arguments: unknown
}

type AiMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  name?: string
  tool_call_id?: string
  tool_calls?: Array<{
    id: string
    type: 'function'
    function: { name: string; arguments: string }
  }>
}

/** Failure the user should see as a friendly message rather than a raw error. */
export class AssistantUnavailableError extends Error {
  constructor(
    message: string,
    readonly reason: 'free_quota' | 'busy',
  ) {
    super(message)
    this.name = 'AssistantUnavailableError'
  }
}

/**
 * Maps Workers AI errors to friendly ones: 3036 is the daily free Neuron
 * allocation running out, 3040 (or a bare 429) is a capacity limit.
 */
export function classifyAiError(error: unknown): AssistantUnavailableError | null {
  const message = error instanceof Error ? error.message : String(error)
  if (/\b3036\b|daily free allocation|neurons/i.test(message)) {
    return new AssistantUnavailableError(FREE_QUOTA_USED_MESSAGE, 'free_quota')
  }
  if (/\b3040\b|\b429\b|capacity|rate limit/i.test(message)) {
    return new AssistantUnavailableError(AI_BUSY_MESSAGE, 'busy')
  }
  return null
}

function parseArguments(value: unknown): unknown {
  if (typeof value !== 'string') return value ?? {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

/** Accepts both the native (`response`/`tool_calls`) and OpenAI-style output. */
function readOutput(output: unknown): { text: string; toolCalls: Array<ToolCall> } {
  const record = (output ?? {}) as {
    response?: unknown
    tool_calls?: Array<{
      id?: string
      name?: string
      arguments?: unknown
      function?: { name?: string; arguments?: unknown }
    }>
    choices?: Array<{ message?: { content?: unknown; tool_calls?: unknown } }>
  }
  const message = record.choices?.[0]?.message
  // Prefer the OpenAI-style calls: only they carry the ids results must echo.
  const rawCalls = (message?.tool_calls ?? record.tool_calls ?? []) as NonNullable<
    typeof record.tool_calls
  >
  const toolCalls = rawCalls
    .map((call) => ({
      id: call.id,
      name: call.name ?? call.function?.name ?? '',
      arguments: parseArguments(call.arguments ?? call.function?.arguments),
    }))
    .filter((call) => call.name)
  const text = record.response ?? message?.content
  return { text: typeof text === 'string' ? text.trim() : '', toolCalls }
}

export async function runAssistantConversation(input: {
  ai: AiBinding
  tools: AssistantToolset
  question: string
  history: Array<AssistantHistoryTurn>
  context: AssistantToolContext
  /** Today's date (YYYY-MM-DD) in India. */
  today: string
}): Promise<AssistantAnswer> {
  const messages: Array<AiMessage> = [
    { role: 'system', content: `${SYSTEM_PROMPT}\nToday is ${input.today}.` },
    ...input.history,
    { role: 'user', content: input.question },
  ]
  const tools = input.tools.definitions.map((definition) => ({
    type: 'function',
    function: definition,
  }))
  const links = new Map<string, AssistantLink>()

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let output: unknown
    try {
      output = await input.ai.run(ASSISTANT_MODEL, {
        messages,
        tools,
        max_tokens: 400,
      })
    } catch (error) {
      throw classifyAiError(error) ?? error
    }

    const { text, toolCalls } = readOutput(output)
    if (toolCalls.length === 0) {
      return {
        answer: text || "Sorry, I couldn't answer that.",
        links: [...links.values()],
      }
    }

    const withIds = toolCalls.filter(
      (call): call is ToolCall & { id: string } => Boolean(call.id),
    )
    if (withIds.length > 0) {
      messages.push({
        role: 'assistant',
        content: text,
        tool_calls: withIds.map((call) => ({
          id: call.id,
          type: 'function',
          function: { name: call.name, arguments: JSON.stringify(call.arguments) },
        })),
      })
    }

    for (const call of toolCalls) {
      let content: string
      try {
        const result = await input.tools.run(
          call.name,
          call.arguments,
          input.context,
        )
        links.set(result.link.href, result.link)
        content = JSON.stringify(result.data)
      } catch (error) {
        content = `Error: ${error instanceof Error ? error.message : 'tool failed'}`
      }
      messages.push(
        call.id
          ? { role: 'tool', tool_call_id: call.id, name: call.name, content }
          : { role: 'tool', name: call.name, content },
      )
    }
  }

  return {
    answer: "Sorry, I couldn't finish answering that. Try a narrower question.",
    links: [...links.values()],
  }
}
