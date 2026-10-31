# Production Gap Audit and Plan (Oct 2026)

This audit was made from a read of the codebase on branch
`claude/claude-md-landing-contact`. Nothing in it has been changed yet. Each
item names the file it was found in.

## P0: correctness and data integrity (live money data)

| #   | Issue | Where | Fix |
| --- | ----- | ----- | --- |
| 1 | **There are no DB transactions anywhere.** The invoice header, lines, ledger entry, stock movements, and sequence bump are separate HTTP calls. A failure mid-way leaves half-posted vouchers, which breaks the "must use database transactions" rule. `neon-http` cannot run interactive transactions. | `src/db/client.ts`, every `Drizzle*Repository` | Add a `neon-serverless` (WebSocket `Pool`) client used only for posting flows, wrapping `db.transaction()` per request on Workers. An alternative is `db.batch([...])` with pre-generated ids. Start with sales invoice, purchase bill, and payment. |
| 2 | **Document number race.** `findForUpdate` is a plain `SELECT` followed by an upsert. Two concurrent saves read the same `nextNumber`, and the second then fails on `sales_invoices_company_number_idx` (the user sees an error and the data may be partial, see #1). | `src/features/documents/document-sequence-store.ts:60` | Use an atomic `UPDATE … SET next_number = next_number + 1 … RETURNING`, inside the transaction from #1. |
| 3 | **Silent in-memory fallback.** If `DATABASE_URL` is missing on a deploy, every store quietly switches to `InMemory…`, so data is accepted and then lost. | `create*Repository()` in all stores | Throw at startup when `import.meta.env.PROD` is true and the DB is missing. |
| 4 | **The PostHog root throws in dev when env is unset**, and the `.env.example` placeholder `<ph_client_api_host>` fails `z.string().url()`. A fresh `cp .env.example .env.local` crashes the app. | `src/routes/__root.tsx` (uncommitted), `.env.example` | Warn instead of throwing, and blank the placeholders. |

## P1: security and abuse

| #   | Issue | Fix |
| --- | ----- | --- |
| 5 | No rate limiting is configured for auth (`src/lib/auth.ts`). New public forms (waitlist, feedback, contact) would also be open to spam. | Enable the Better Auth `rateLimit`. For public forms, use a Cloudflare Turnstile token, a honeypot field, and a per-IP limit (Workers Rate Limiting binding). |
| 6 | No security headers (CSP, `X-Frame-Options`, `Referrer-Policy`, HSTS). | Set them in the server entry or the Cloudflare dashboard Transform Rules. |
| 7 | Role capability is checked on posting only, not on every read (see `busy-21-gap-status.md`). | Extend `capabilityProcedure` to sensitive reads (reports, audit, exports). |

## P1: performance

| #   | Issue | Where | Fix |
| --- | ----- | ----- | --- |
| 8 | Invoice cancel loads **every ledger entry for the company** to find one. | `sales-invoice-service.ts:452` | Add `posting.findById`. |
| 9 | GST reports load all invoices, bills, and parties for the company into memory, then filter. This grows linearly with history. | `src/features/gst/gst-report-documents.ts` | Filter by period in SQL and aggregate in SQL for summaries. |
| 10 | N+1 item lookups per voucher line (`deps.items.findById` in a loop). | `sales-invoice-service.ts:321,358,476` | Batch with `findByIds` (`inArray`). |
| 11 | `/app` `beforeLoad` calls `getSession` plus `companies.list` on **every** child navigation. | `src/routes/app.tsx` | Cache through the queryClient (`ensureQueryData`) with a staleTime. |
| 12 | Very large client components: `voucher-entry-page.tsx` (1,874 lines) and `reports-panel.tsx` (1,364 lines). | — | Split per tab and lazy-load report tabs. |
| 13 | The marketing header fetches the session client-side on every landing view (extra request, CTA flicker). | `landing-header.tsx` | Accept it, or read the cookie presence only. |
| 14 | `posthog-node` was added but is unused. | `package.json` | Remove it until server events are needed. |

## Missing product features (proposed)

Ordered by value for Indian SMB users, given that `busy-21-gap-status.md`
already covers core parity:

1. **WhatsApp/email invoice sharing**, with a payment link (UPI QR on the
   invoice print).
2. **Payment reminders** for overdue receivables (the ageing data already
   exists).
3. **Live e-invoice and e-way bill via a GSP.** These are currently stubbed.
4. **Recurring invoices** (rent, AMC, subscriptions).
5. **POS mode plus barcode** for retail counters.
6. **BOM / simple manufacturing**.
7. **Bank statement import** for auto reconciliation (CSV/PDF), building on the
   current OCR pipeline.
8. **Tally XML export** (accountants ask for this first).
9. **Data backup/export of the whole company** (the trust signal for an
   open-source SaaS).
10. **In-app feedback and changelog** (covered by the plan below).

## Plan: landing email capture, feedback, and contact page

The industry-standard shape is to store every submission in Postgres (the
source of truth), notify the team by email through Resend, and protect the
forms with a honeypot plus Turnstile plus a rate limit. Submissions are never
sent to third-party form services.

### Data

One table, `marketing_submissions`. It is a public, non-company table, so it is
the documented exception to the `company_id` rule.

- `id`, `kind` (`waitlist` | `feedback` | `contact`), `email`, `name?`,
  `company?`, `phone?`, `topic?` (sales/support/partnership/other), `message?`,
  `rating?` (1–5, feedback), `source_path`, `utm` (jsonb), `user_agent`,
  `ip_hash` (salted SHA-256, never the raw IP), `status`
  (`new` | `handled` | `spam`), `created_at`.
- A unique index on `(kind, lower(email))` for `waitlist`, so a repeat signup
  is idempotent and reports success.

### Server

- `src/features/marketing/submission-service.ts`: zod schemas, normalisation
  (trim, lowercase the email), and the honeypot check. Built TDD with tests
  first.
- `submission-store.ts`: an InMemory and a Drizzle repository.
- `marketing-router.ts`: `publicProcedure` mutations `subscribe`,
  `sendFeedback`, and `sendContact`. They verify Turnstile server-side
  (`TURNSTILE_SECRET_KEY`), apply a per-IP limit, insert the row, and fire a
  Resend notification to `CONTACT_INBOX` (non-blocking through
  `ctx.waitUntil`). The user gets a confirmation email for contact requests
  only.
- New env vars: `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`,
  `CONTACT_INBOX`.

### UI (shadcn, existing design system)

- **Landing email capture:** extend `LandingCta` (a hero surface) with an
  inline `Input` plus a "Get updates" `Button`, toasting success through
  `sonner`. The copy goes in `landing-content.ts`.
- **Feedback form:** a new `LandingFeedback` section before the FAQ. It is a
  `Card` with a rating `ToggleGroup` (1–5), a `Textarea`, and an optional
  email. It also opens from a "Feedback" link in the footer (anchor
  `#feedback`).
- **Contact page `/contact`:** a thin route with `head()` (canonical, OG, and
  `ContactPage` JSON-LD) that renders `ContactPage` from
  `src/features/marketing/components/`. It has name, email, phone (optional),
  topic `Select`, and message `Textarea` fields, plus a side card with the
  GitHub issues link and response-time expectations. The same header and
  footer are used. It is added to `NAV_LINKS`, `LandingFooter`, and
  `public/sitemap.xml`.
- All forms use `@tanstack/react-form` plus zod (already a dependency), with
  accessible labels and errors, a disabled state while submitting, and a
  hidden honeypot. They fire GA/PostHog events `waitlist_submitted`,
  `feedback_submitted`, and `contact_submitted`.
- Verified at desktop and 375px, in light and dark.

### Ops (production)

1. Generate the migration (`bun run db:generate`), review the SQL, and apply
   it to Neon. This only adds a new table, so it is backwards-compatible.
2. Add the Cloudflare secrets `TURNSTILE_SECRET_KEY` and `CONTACT_INBOX`, set
   `VITE_TURNSTILE_SITE_KEY` at build time, and verify the Resend sending
   domain for `hisaabkro.in`.
3. Deploy, submit each form once, and check the row plus the email.

### Out of scope for this branch

The P0 transaction and sequence fixes (#1–#3) touch live accounting writes and
should go in their own PR, test-first.
