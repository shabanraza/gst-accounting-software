import { z } from 'zod'

export const SUBMISSION_KINDS = ['waitlist', 'feedback', 'contact'] as const
export type SubmissionKind = (typeof SUBMISSION_KINDS)[number]

export const CONTACT_TOPICS = [
  'sales',
  'support',
  'partnership',
  'other',
] as const

/** Per-IP cap across all public forms. */
export const SUBMISSION_RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 }

const emailSchema = z.string().trim().toLowerCase().email().max(254)
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value || undefined)

export const waitlistInputSchema = z.object({ email: emailSchema })

export const feedbackInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  message: z.string().trim().min(1).max(2000),
  email: emailSchema.optional().or(z.literal('').transform(() => undefined)),
})

export const contactInputSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  phone: optionalText(20).refine(
    (value) => !value || /^[+\d][\d\s-]{6,19}$/.test(value),
    'Enter a valid phone number',
  ),
  topic: z.enum(CONTACT_TOPICS).default('other'),
  message: z.string().trim().min(10).max(2000),
})

export type WaitlistInput = z.infer<typeof waitlistInputSchema>
export type FeedbackInput = z.infer<typeof feedbackInputSchema>
export type ContactInput = z.infer<typeof contactInputSchema>

export type SubmissionRecord = {
  id: string
  kind: SubmissionKind
  email: string | null
  name: string | null
  phone: string | null
  topic: string | null
  message: string | null
  rating: number | null
  sourcePath: string | null
  userAgent: string | null
  ipHash: string | null
  status: 'new' | 'handled' | 'spam'
  createdAt: Date
}

export interface SubmissionRepository {
  /** Returns false when the row already exists (repeat waitlist email). */
  create: (record: SubmissionRecord) => Promise<boolean>
  countByIpHashSince: (ipHash: string, since: Date) => Promise<number>
}

export type SubmissionNotifier = (record: SubmissionRecord) => Promise<void>

export class TooManySubmissionsError extends Error {
  constructor() {
    super('Too many submissions. Please try again in a few minutes.')
    this.name = 'TooManySubmissionsError'
  }
}

export type SubmissionForm =
  | { kind: 'waitlist'; fields: WaitlistInput }
  | { kind: 'feedback'; fields: FeedbackInput }
  | { kind: 'contact'; fields: ContactInput }

type SubmitInput = SubmissionForm & {
  ipHash: string | null
  userAgent: string | null
  sourcePath: string | null
  /** Hidden field; humans never fill it. */
  honeypot?: string
}

export async function submitMarketingForm(
  deps: {
    submissions: SubmissionRepository
    notify: SubmissionNotifier
    now: () => Date
  },
  input: SubmitInput,
): Promise<{ ok: true }> {
  // Report success to bots so they don't retry with a different payload.
  if (input.honeypot) return { ok: true }

  const now = deps.now()
  if (input.ipHash) {
    const recent = await deps.submissions.countByIpHashSince(
      input.ipHash,
      new Date(now.getTime() - SUBMISSION_RATE_LIMIT.windowMs),
    )
    if (recent >= SUBMISSION_RATE_LIMIT.max) {
      throw new TooManySubmissionsError()
    }
  }

  const fields: Partial<ContactInput & FeedbackInput> = input.fields
  const record: SubmissionRecord = {
    id: crypto.randomUUID(),
    kind: input.kind,
    email: fields.email ?? null,
    name: fields.name ?? null,
    phone: fields.phone ?? null,
    topic: fields.topic ?? null,
    message: fields.message ?? null,
    rating: fields.rating ?? null,
    sourcePath: input.sourcePath,
    userAgent: input.userAgent,
    ipHash: input.ipHash,
    status: 'new',
    createdAt: now,
  }

  const created = await deps.submissions.create(record)
  if (created) {
    try {
      await deps.notify(record)
    } catch (error) {
      console.error('[marketing] notification failed', error)
    }
  }

  return { ok: true }
}
