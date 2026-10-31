import Anthropic from '@anthropic-ai/sdk'
import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { runAssistantConversation } from '#/features/assistant/assistant-service.ts'
import { createAssistantTools } from '#/features/assistant/assistant-tools.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { protectedProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { CreateMessage } from '#/features/assistant/assistant-service.ts'
import type { AssistantToolDeps } from '#/features/assistant/assistant-tools.ts'

const askInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  question: z.string().trim().min(1).max(1000),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(4000),
      }),
    )
    .max(10)
    .default([]),
})

type AssistantRouterDeps = AssistantToolDeps & {
  /** Server-only; read per request so a Worker secret change applies at once. */
  getApiKey: () => string | undefined
  /** Injected in tests; defaults to the Anthropic SDK. */
  createMessage?: (apiKey: string) => CreateMessage
}

const sdkCreateMessage = (apiKey: string): CreateMessage => {
  const client = new Anthropic({ apiKey })
  return (params) => client.beta.messages.create(params)
}

function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    now,
  )
}

export const createAssistantRouter = (deps: AssistantRouterDeps) => {
  const tools = createAssistantTools(deps)
  return {
    status: protectedProcedure.query(() => ({
      configured: Boolean(deps.getApiKey()),
    })),
    ask: capabilityProcedure('view_reports')
      .input(askInputSchema)
      .mutation(async ({ input }) => {
        const apiKey = deps.getApiKey()
        if (!apiKey) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Ask your books is not configured.',
          })
        }
        try {
          return await runAssistantConversation({
            createMessage: (deps.createMessage ?? sdkCreateMessage)(apiKey),
            tools,
            question: input.question,
            history: input.history,
            context: {
              companyId: input.companyId,
              companyStateCode: input.companyStateCode,
            },
            today: todayInIndia(),
          })
        } catch (error) {
          if (error instanceof Anthropic.RateLimitError) {
            throw new TRPCError({
              code: 'TOO_MANY_REQUESTS',
              message: 'Too many questions right now. Try again in a minute.',
            })
          }
          if (error instanceof Anthropic.APIError) {
            console.error('assistant: Anthropic API error', error.status)
            throw new TRPCError({
              code: 'INTERNAL_SERVER_ERROR',
              message: 'The assistant could not answer. Try again.',
            })
          }
          throw error
        }
      }),
  } satisfies TRPCRouterRecord
}
