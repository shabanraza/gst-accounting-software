import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import {
  TooManySubmissionsError,
  contactInputSchema,
  feedbackInputSchema,
  submitMarketingForm,
  waitlistInputSchema,
} from '#/features/marketing/submission-service.ts'
import {
  hashClientIp,
  verifyTurnstileToken,
} from '#/features/marketing/submission-guards.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'
import { sendSubmissionNotificationEmail } from '#/lib/email.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type {
  SubmissionForm,
  SubmissionRecord,
  SubmissionRepository,
} from '#/features/marketing/submission-service.ts'
import type { TRPCContext } from '#/integrations/trpc/init.ts'

/** Spam-guard fields every public form sends alongside its own fields. */
const guardSchema = z.object({
  website: z.string().max(200).optional(),
  turnstileToken: z.string().max(2048).optional(),
  sourcePath: z.string().max(200).optional(),
})

function notifyTeam(record: SubmissionRecord) {
  return sendSubmissionNotificationEmail({
    kind: record.kind,
    fields: {
      Name: record.name,
      Email: record.email,
      Phone: record.phone,
      Topic: record.topic,
      Rating: record.rating,
      Message: record.message,
      Page: record.sourcePath,
    },
  })
}

export const createMarketingRouter = (submissions: SubmissionRepository) => {
  async function submit(
    ctx: TRPCContext,
    guard: z.infer<typeof guardSchema>,
    form: SubmissionForm,
  ) {
    const verified = await verifyTurnstileToken(
      guard.turnstileToken,
      ctx.request,
    )
    if (!verified) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Verification failed. Refresh the page and try again.',
      })
    }

    try {
      return await submitMarketingForm(
        { submissions, notify: notifyTeam, now: () => new Date() },
        {
          ...form,
          honeypot: guard.website,
          ipHash: await hashClientIp(ctx.request),
          userAgent: ctx.request.headers.get('user-agent')?.slice(0, 300) ?? null,
          sourcePath: guard.sourcePath ?? null,
        },
      )
    } catch (error) {
      if (error instanceof TooManySubmissionsError) {
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: error.message,
        })
      }
      throw error
    }
  }

  return {
    subscribe: publicProcedure
      .input(waitlistInputSchema.extend(guardSchema.shape))
      .mutation(({ ctx, input: { website, turnstileToken, sourcePath, ...fields } }) =>
        submit(ctx, { website, turnstileToken, sourcePath }, {
          kind: 'waitlist',
          fields,
        }),
      ),
    sendFeedback: publicProcedure
      .input(feedbackInputSchema.extend(guardSchema.shape))
      .mutation(({ ctx, input: { website, turnstileToken, sourcePath, ...fields } }) =>
        submit(ctx, { website, turnstileToken, sourcePath }, {
          kind: 'feedback',
          fields,
        }),
      ),
    sendContact: publicProcedure
      .input(contactInputSchema.extend(guardSchema.shape))
      .mutation(({ ctx, input: { website, turnstileToken, sourcePath, ...fields } }) =>
        submit(ctx, { website, turnstileToken, sourcePath }, {
          kind: 'contact',
          fields,
        }),
      ),
  } satisfies TRPCRouterRecord
}
