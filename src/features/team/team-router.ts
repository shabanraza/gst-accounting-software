import { TRPCError } from '@trpc/server'
import { z } from 'zod'

import { listCompaniesByIds } from '#/features/companies/company-service.ts'
import {
  acceptInvitation,
  createInvitation,
  revokeInvitation,
} from '#/features/team/invitation-service.ts'
import { sendInvitationEmail } from '#/lib/email.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { protectedProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { CompanyRepository } from '#/features/companies/company-service.ts'
import type { MembershipRepository } from '#/features/companies/membership-service.ts'
import type { InvitationRepository } from '#/features/team/invitation-service.ts'
import type { UserDirectory } from '#/features/team/user-directory.ts'

const companyRoleSchema = z.enum([
  'admin',
  'accountant',
  'billing',
  'inventory',
  'readonly',
])

export type TeamRouterDependencies = {
  memberships: MembershipRepository
  invitations: InvitationRepository
  companies: CompanyRepository
  users: UserDirectory
}

function inviteUrl(token: string): string {
  const base = process.env.BETTER_AUTH_URL ?? ''
  return `${base}/accept-invite?token=${token}`
}

export const createTeamRouter = (deps: TeamRouterDependencies) =>
  ({
    listMembers: capabilityProcedure('manage_company')
      .input(z.object({ companyId: z.string().uuid() }))
      .query(async ({ input }) => {
        const memberships = await deps.memberships.listByCompanyId(
          input.companyId,
        )
        const users = await deps.users.listByIds(
          memberships.map((membership) => membership.userId),
        )
        const userById = new Map(users.map((user) => [user.id, user]))

        const invitations = await deps.invitations.listByCompanyId(
          input.companyId,
        )

        return {
          members: memberships.map((membership) => ({
            userId: membership.userId,
            role: membership.role,
            name: userById.get(membership.userId)?.name ?? null,
            email: userById.get(membership.userId)?.email ?? null,
          })),
          invitations: invitations
            .filter((invitation) => invitation.status === 'pending')
            .map((invitation) => ({
              email: invitation.email,
              role: invitation.role,
              expiresAt: invitation.expiresAt,
            })),
        }
      }),
    invite: capabilityProcedure('manage_company')
      .input(
        z.object({
          companyId: z.string().uuid(),
          email: z.string().email(),
          role: companyRoleSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const invitation = await createInvitation(deps.invitations, {
          companyId: input.companyId,
          email: input.email,
          role: input.role,
          invitedByUserId: ctx.userId,
        })

        const companies = await listCompaniesByIds(deps.companies, [
          input.companyId,
        ])
        const company = companies.at(0)

        await sendInvitationEmail({
          to: invitation.email,
          url: inviteUrl(invitation.token),
          companyName: company?.tradeName ?? 'your company',
          role: invitation.role,
        })

        return { email: invitation.email, role: invitation.role }
      }),
    resendInvite: capabilityProcedure('manage_company')
      .input(
        z.object({
          companyId: z.string().uuid(),
          email: z.string().email(),
        }),
      )
      .mutation(async ({ input }) => {
        const invitation = await deps.invitations.findByCompanyAndEmail(
          input.companyId,
          input.email.trim().toLowerCase(),
        )
        if (!invitation || invitation.status !== 'pending') {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'No pending invitation for this email',
          })
        }

        const companies = await listCompaniesByIds(deps.companies, [
          input.companyId,
        ])
        const company = companies.at(0)

        await sendInvitationEmail({
          to: invitation.email,
          url: inviteUrl(invitation.token),
          companyName: company?.tradeName ?? 'your company',
          role: invitation.role,
        })

        return { email: invitation.email }
      }),
    revokeInvite: capabilityProcedure('manage_company')
      .input(
        z.object({
          companyId: z.string().uuid(),
          email: z.string().email(),
        }),
      )
      .mutation(async ({ input }) => {
        await revokeInvitation(deps.invitations, {
          companyId: input.companyId,
          email: input.email,
        })
        return { ok: true }
      }),
    updateRole: capabilityProcedure('manage_company')
      .input(
        z.object({
          companyId: z.string().uuid(),
          userId: z.string().min(1),
          role: companyRoleSchema,
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You cannot change your own role',
          })
        }

        const members = await deps.memberships.listByCompanyId(input.companyId)
        const target = members.find((entry) => entry.userId === input.userId)
        if (!target) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Member not found' })
        }
        if (target.role === 'owner') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'The owner role cannot be changed',
          })
        }

        const updated = await deps.memberships.updateRole(
          input.companyId,
          input.userId,
          input.role,
        )
        return updated
      }),
    removeMember: capabilityProcedure('manage_company')
      .input(
        z.object({
          companyId: z.string().uuid(),
          userId: z.string().min(1),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.userId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'You cannot remove yourself',
          })
        }

        const members = await deps.memberships.listByCompanyId(input.companyId)
        const target = members.find((entry) => entry.userId === input.userId)
        if (target?.role === 'owner') {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'The owner cannot be removed',
          })
        }

        await deps.memberships.remove(input.companyId, input.userId)
        return { ok: true }
      }),
    acceptInvite: protectedProcedure
      .input(z.object({ token: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const invitation = await acceptInvitation(
          { invitations: deps.invitations, memberships: deps.memberships },
          {
            token: input.token,
            userId: ctx.userId,
            userEmail: ctx.session.user.email,
          },
        )
        return { companyId: invitation.companyId }
      }),
  }) satisfies TRPCRouterRecord
