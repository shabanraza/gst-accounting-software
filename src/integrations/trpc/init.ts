import { initTRPC, TRPCError } from '@trpc/server'
import superjson from 'superjson'

import { assertCompanyMembership } from '#/features/companies/membership-service.ts'
import { createMembershipRepository } from '#/features/companies/membership-store.ts'
import { auth } from '#/lib/auth.ts'

export type AuthSession = {
  user: {
    id: string
    email: string
    name: string
  }
  session: {
    id: string
    userId: string
  }
}

export type TRPCContext = {
  session: AuthSession | null
  request: Request
}

export async function createTRPCContext(opts: {
  request: Request
}): Promise<TRPCContext> {
  try {
    const session = await auth.api.getSession({
      headers: opts.request.headers,
    })

    if (!session) {
      return { session: null, request: opts.request }
    }

    return {
      request: opts.request,
      session: {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
        },
        session: {
          id: session.session.id,
          userId: session.session.userId,
        },
      },
    }
  } catch {
    return { session: null, request: opts.request }
  }
}

const t = initTRPC.context<TRPCContext>().create({
  transformer: superjson,
})

export const createTRPCRouter = t.router
export const publicProcedure = t.procedure

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
      userId: ctx.session.user.id,
    },
  })
})

/** Any authenticated write. The actor is always the session user. */
export const mutatingProcedure = protectedProcedure

/**
 * Company-scoped procedure: requires a session and a `companyId` in the input,
 * exposing both `ctx.userId` and `ctx.companyId`. Per-mutation capability checks
 * (see `assertCapability`) run inside each router using the injected membership
 * repository so unit tests can supply their own memberships.
 */
export const companyProcedure = t.procedure.use(
  async ({ ctx, next, getRawInput }) => {
    if (!ctx.session?.user) {
      throw new TRPCError({ code: 'UNAUTHORIZED' })
    }

    const rawInput = await getRawInput()
    const companyId =
      rawInput &&
      typeof rawInput === 'object' &&
      'companyId' in rawInput &&
      typeof rawInput.companyId === 'string'
        ? rawInput.companyId
        : null

    if (!companyId) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'companyId is required for this action',
      })
    }

    const memberships = createMembershipRepository()
    try {
      await assertCompanyMembership(memberships, {
        companyId,
        userId: ctx.session.user.id,
      })
    } catch {
      throw new TRPCError({ code: 'FORBIDDEN' })
    }

    return next({
      ctx: {
        ...ctx,
        session: ctx.session,
        userId: ctx.session.user.id,
        companyId,
      },
    })
  },
)
