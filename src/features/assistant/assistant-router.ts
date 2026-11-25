import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  ASSISTANT_DAILY_LIMIT,
  AssistantUnavailableError,
  DAILY_LIMIT_MESSAGE,
  runAssistantConversation,
} from '#/features/assistant/assistant-service.ts'
import { createAssistantTools } from '#/features/assistant/assistant-tools.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { protectedProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { AiBinding } from '#/features/assistant/assistant-service.ts'
import type { AssistantToolDeps } from '#/features/assistant/assistant-tools.ts'
import type { AssistantUsageRepository } from '#/features/assistant/assistant-usage-store.ts'

const askInputSchema = z.object({
  companyId: z.string().uuid(),
  companyStateCode: z.string().length(2),
  question: z.string().trim().min(1).max(500),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(2000),
      }),
    )
    .max(6)
    .default([]),
})

type AssistantRouterDeps = AssistantToolDeps & {
  usage: AssistantUsageRepository
  /** The Workers AI binding (`env.AI`); undefined where it is not bound. */
  getAi: () => Promise<AiBinding | undefined>
}

function todayInIndia(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(
    now,
  )
}

export const createAssistantRouter = (deps: AssistantRouterDeps) => {
  const tools = createAssistantTools(deps)
  return {
    status: protectedProcedure.query(async () => ({
      configured: Boolean(await deps.getAi()),
      dailyLimit: ASSISTANT_DAILY_LIMIT,
    })),
    ask: capabilityProcedure('view_reports')
      .input(askInputSchema)
      .mutation(async ({ input }) => {
        const ai = await deps.getAi()
        if (!ai) {
          throw new TRPCError({
            code: 'PRECONDITION_FAILED',
            message: 'Ask your books is not configured.',
          })
        }
        const today = todayInIndia()
        const used = await deps.usage.increment(input.companyId, today)
        if (used > ASSISTANT_DAILY_LIMIT) {
          throw new TRPCError({
            code: 'TOO_MANY_REQUESTS',
            message: DAILY_LIMIT_MESSAGE,
          })
        }
        try {
          return await runAssistantConversation({
            ai,
            tools,
            question: input.question,
            history: input.history,
            context: {
              companyId: input.companyId,
              companyStateCode: input.companyStateCode,
            },
            today,
          })
        } catch (error) {
          if (error instanceof AssistantUnavailableError) {
            throw new TRPCError({
              code: 'TOO_MANY_REQUESTS',
              message: error.message,
            })
          }
          console.error('assistant: Workers AI call failed', error)
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'The assistant could not answer. Please try again.',
          })
        }
      }),
  } satisfies TRPCRouterRecord
}
