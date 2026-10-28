import { z } from 'zod'

import { buildProblemReportEmail } from '#/features/support/problem-report.ts'
import {
  createTRPCRouter,
  protectedProcedure,
} from '#/integrations/trpc/init.ts'
import type { sendEmail } from '#/lib/email.ts'

const reportProblemInput = z.object({
  description: z.string().trim().min(1).max(4000),
  route: z.string().max(500),
  appVersion: z.string().max(20),
  userAgent: z.string().max(500),
})

export function createSupportRouter(deps: { send: typeof sendEmail }) {
  return createTRPCRouter({
    reportProblem: protectedProcedure
      .input(reportProblemInput)
      .mutation(async ({ ctx, input }) => {
        await deps.send(
          buildProblemReportEmail({
            ...input,
            reporter: {
              name: ctx.session.user.name,
              email: ctx.session.user.email,
            },
          }),
        )
        return { ok: true }
      }),
  })
}
