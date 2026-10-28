import { initTRPC, TRPCError } from '@trpc/server'
import { DomainError } from '#/lib/domain-error.ts'
import superjson from 'superjson'

import { assertCompanyMembership } from '#/features/companies/membership-service.ts'
import { membershipRepository } from '#/features/companies/membership-store.ts'

import type { MembershipRecord } from '#/features/companies/membership-service.ts'
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

function domainErrorCode(error: DomainError): TRPCError['code'] {
  if (error.name.includes('NotFound')) return 'NOT_FOUND'
  if (/^Duplicate|Already/.test(error.name)) return 'CONFLICT'
  if (error.name === 'InsufficientRoleError') return 'FORBIDDEN'
  return 'BAD_REQUEST'
}

/** Business-rule failures reach the client as 4xx with their message, not 500. */
const baseProcedure = t.procedure.use(async ({ next }) => {
  const result = await next()
  if (!result.ok && result.error.cause instanceof DomainError) {
    throw new TRPCError({
      code: domainErrorCode(result.error.cause),
      message: result.error.cause.message,
      cause: result.error.cause,
    })
  }
  return result
})

export const createTRPCRouter = t.router
export const publicProcedure = baseProcedure

export const protectedProcedure = baseProcedure.use(({ ctx, next }) => {
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
export const companyProcedure = baseProcedure.use(
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

    const memberships = membershipRepository
    let membership: MembershipRecord
    try {
      membership = await assertCompanyMembership(memberships, {
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
        membership,
      },
    })
  },
)
