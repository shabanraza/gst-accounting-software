import { z } from 'zod'

import { diffFields, recordMasterEvent } from '#/features/audit/audit-service.ts'
import {
  createParty,
  listPartiesByCompany,
  updateParty,
} from '#/features/parties/party-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { AuditLogRepository } from '#/features/audit/audit-service.ts'
import type {
  PartyRecord,
  PartyRepository,
} from '#/features/parties/party-service.ts'

const partyContactFieldsSchema = {
  pan: z.string().optional().default(''),
  addressLine1: z.string().optional().default(''),
  addressLine2: z.string().optional().default(''),
  city: z.string().optional().default(''),
  pincode: z.string().optional().default(''),
  contactPhone: z.string().optional().default(''),
  contactEmail: z.string().optional().default(''),
  billingAddress: z.string().optional().default(''),
  shippingAddress: z.string().optional().default(''),
}

const createPartyInputSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1),
  partyType: z.enum(['customer', 'supplier', 'both']),
  gstin: z
    .union([z.string().trim().min(1), z.null()])
    .optional()
    .transform((value) => value ?? null),
  stateCode: z.string().length(2),
  creditLimit: z.string().nullable(),
  paymentTermsDays: z.number().int().min(0),
  receivableAccountId: z.string().uuid().nullable(),
  payableAccountId: z.string().uuid().nullable(),
  priceListId: z.string().uuid().nullable().optional(),
  ...partyContactFieldsSchema,
})

const updatePartyInputSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1),
  partyType: z.enum(['customer', 'supplier', 'both']),
  gstin: z
    .union([z.string().trim().min(1), z.null()])
    .optional()
    .transform((value) => value ?? null),
  stateCode: z.string().length(2),
  creditLimit: z.string().nullable(),
  paymentTermsDays: z.number().int().min(0),
  priceListId: z.string().uuid().nullable().optional(),
  ...partyContactFieldsSchema,
})

const listPartiesInputSchema = z.object({
  companyId: z.string().uuid(),
})

// Billing/shipping addresses are built from the address fields, so skip them.
const auditedPartyFields = [
  'name',
  'partyType',
  'gstin',
  'stateCode',
  'creditLimit',
  'paymentTermsDays',
  'priceListId',
  'pan',
  'addressLine1',
  'addressLine2',
  'city',
  'pincode',
  'contactPhone',
  'contactEmail',
] as const satisfies ReadonlyArray<keyof PartyRecord>

export const createPartiesRouter = (
  repository: PartyRepository,
  audit: AuditLogRepository,
) =>
  ({
    list: capabilityProcedure('view').input(listPartiesInputSchema).query(({ input }) => {
      return listPartiesByCompany(repository, input.companyId)
    }),
    create: capabilityProcedure('manage_masters')
      .input(createPartyInputSchema)
      .mutation(async ({ ctx, input }) => {
        const party = await createParty(repository, input)
        await recordMasterEvent(audit, {
          companyId: party.companyId,
          actorUserId: ctx.userId,
          action: 'party.created',
          entityType: 'party',
          entityId: party.id,
          label: party.name,
        })
        return party
      }),
    update: capabilityProcedure('manage_masters')
      .input(updatePartyInputSchema)
      .mutation(async ({ ctx, input }) => {
        const before = await repository.findById(input.id)
        const party = await updateParty(repository, input)
        if (before) {
          await recordMasterEvent(audit, {
            companyId: party.companyId,
            actorUserId: ctx.userId,
            action: 'party.updated',
            entityType: 'party',
            entityId: party.id,
            label: party.name,
            changes: diffFields(before, party, auditedPartyFields),
          })
        }
        return party
      }),
  }) satisfies TRPCRouterRecord
