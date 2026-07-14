import { z } from 'zod'

import {
  createParty,
  listPartiesByCompany,
  updateParty,
} from '#/features/parties/party-service.ts'
import { capabilityProcedure } from '#/integrations/trpc/company-procedures.ts'
import { publicProcedure } from '#/integrations/trpc/init.ts'

import type { TRPCRouterRecord } from '@trpc/server'
import type { PartyRepository } from '#/features/parties/party-service.ts'

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

export const createPartiesRouter = (repository: PartyRepository) =>
  ({
    list: publicProcedure.input(listPartiesInputSchema).query(({ input }) => {
      return listPartiesByCompany(repository, input.companyId)
    }),
    create: capabilityProcedure('manage_masters')
      .input(createPartyInputSchema)
      .mutation(({ input }) => {
        return createParty(repository, input)
      }),
    update: capabilityProcedure('manage_masters')
      .input(updatePartyInputSchema)
      .mutation(({ input }) => {
        return updateParty(repository, input)
      }),
  }) satisfies TRPCRouterRecord
