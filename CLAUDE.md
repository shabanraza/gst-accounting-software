# CLAUDE.md

HisaabKro (`hisaabkro.in`) — GST billing, khata ledger, inventory, and
accounting SaaS for Indian businesses, aiming at BUSY-level depth. **It is
live in production on Cloudflare Workers**, so treat every change as a
production change.

`AGENTS.md` holds the general agent rules; this file overrides it wherever
they disagree. In particular, the theme is **not teal** any more (see Design).
`DESIGN.md` is the source of truth for visual decisions; read it before any UI
change.

## Stack

- TanStack Start + file-based TanStack Router (`src/routes`, generated
  `src/routeTree.gen.ts`, never hand-edit). React 19 with React Compiler.
- API: tRPC v11 (`src/integrations/trpc/router.ts`), served at
  `src/routes/api.trpc.$.tsx`. superjson transformer.
- Auth: Better Auth (`src/lib/auth.ts`, `/api/auth/*`), email/password plus
  optional Google. `VITE_REQUIRE_AUTH` gates `/app`.
- DB: Neon Postgres via `drizzle-orm/neon-http` (`src/db/client.ts`); schema in
  `src/db/schema.ts`, migrations in `drizzle/`.
- Runtime: Cloudflare Workers (`wrangler.jsonc`, `nodejs_compat`); secrets are
  read through `process.env`.
- Email: Resend REST API (`src/lib/email.ts`); logs to console when
  `RESEND_API_KEY` is unset.
- Analytics: GA4 (`src/integrations/google-analytics.tsx`) and PostHog
  (`__root.tsx`); both are optional and driven by env vars.
- Env validation: `src/env.ts` (t3 env). Every new `VITE_*` var goes there and
  in `.env.example`.
- Workspaces: `mobile/` (Expo app, has its own AGENTS.md) and
  `packages/api-client`.
- Money math: `decimal.js`; never use JS floats for amounts.

## Commands (Bun only, Node per `.nvmrc`)

```bash
bun run dev          # vite dev on :3000
bun run test         # vitest run
bun run lint         # eslint
bun run build        # vite build
bun run db:generate  # drizzle-kit generate (then review SQL in drizzle/)
bun run deploy       # build + wrangler deploy (production; only when asked)
```

Never run `deploy`, `db:push`, or `db:migrate` against production unless the
user explicitly asks.

## Architecture

Each feature lives in `src/features/<feature>/`:

- `*-service.ts`: pure domain logic, unit-tested (`*-service.test.ts`).
- `*-store.ts`: a repository interface with an `InMemory…` implementation
  (tests and no-DB dev) and a `Drizzle…` implementation, selected by
  `create…Repository()` based on `getDb()`.
- `*-router.ts`: a tRPC router factory `create…Router(deps)` that takes its
  repositories as arguments so tests can inject in-memory ones. It is wired in
  `src/integrations/trpc/router.ts`.
- `components/`: feature UI.

Procedures (`src/integrations/trpc/init.ts`, `company-procedures.ts`):

- `publicProcedure`: no auth (health, and future marketing endpoints).
- `protectedProcedure`: session required; `ctx.userId`.
- `companyProcedure`: session plus `companyId` in input plus membership check.
- `capabilityProcedure(cap)`: the above plus a role capability. Use this for
  every posting or mutating action.

Route files stay thin: `head()` for SEO plus one feature component. No business
logic in routes or components.

## Accounting invariants (non-negotiable)

- Every business table carries `company_id`; every query filters on it.
- Accounting-impacting actions post through the central double-entry ledger
  (`src/features/accounting/ledger-posting-*`). Debits equal credits.
- GST is stored separately from inventory cost and party balances.
- Stock changes only through `stock_movements`.
- Document numbers come from `document_sequences`, never `COUNT(*) + 1`.
- OCR and AI produce reviewable drafts; nothing posts without user confirmation.
- Sales, purchases, payments, returns, GST, and stock writes must be atomic.
  Note that `neon-http` has no interactive transactions, so see
  `docs/production-gap-audit.md` before adding multi-step writes.
- TDD for domain behaviour: write the failing test, watch it fail, implement,
  watch it pass.

## Design: "Rich Ledger, Editorial Discipline"

This summarises `DESIGN.md` and `src/styles.css`.

- shadcn style `radix-mira` (`components.json`), lucide icons, IBM Plex Sans
  plus JetBrains Mono (numbers and code).
- **Palette:** chrome is a neutral near-black on a warm paper canvas (hue 95,
  explicit `oklch` values). There is no brand hue and no teal. `--primary` is
  near-black in light mode and near-white in dark mode.
- **Colour means something.** There are five semantic tokens, and they are the
  only colour on screen:
  `money-in` (emerald, sales and receipts), `money-out` (rose, purchases and
  expenses), `gst` (violet), `inventory` (amber), `banking` (sky, alias of
  `info`). Charts map `--chart-1..5` onto these 1:1. Never use one as a
  decorative accent or as primary.
- **Hybrid rule:**
  - Hero and summary surfaces (dashboard KPI cards, empty states, onboarding,
    marketing, toasts) get saturated semantic colour, `.icon-duotone`
    icons, `--radius-hero`, `--elevation-2`, and spring motion. Mark them with
    `data-ui="chrome"` and `data-hero-surface` / `<Card size="hero">`.
  - Dense data surfaces (tables, ledgers, voucher grids) are flat and
    hairline-ruled, use `--radius` (0.5rem), and use fast precise motion
    (`--duration-fast`, `--ease-precise`) with no stagger. Mark them with
    `data-ui="data"`. Never put a table inside a hero, glass, or gradient
    surface.
- **Cards** are borderless and are separated by elevation only
  (`--elevation-1` default/sm, `--elevation-2` hero). Never hand-roll
  `box-shadow`.
- **Glass/blur** is allowed only on the command palette, dialogs and sheets,
  toasts, and the scrolled app header. Popovers, selects, and menus stay opaque.
- **Motion tokens:** `--duration-fast` 120ms, `--duration-base` 180ms,
  `--duration-spring` 220ms. `<CountUpNumber>` is for hero KPIs only.
  `prefers-reduced-motion` is handled globally.
- **Status:** use `Badge` with the variants `success | warning | info |
  destructive | neutral | money-in | money-out | gst | inventory | banking`.
  Pick intents through `src/lib/badge-intent.ts` and don't inline the choice.
- **Shell:** `Sidebar variant="inset"` on `--shell-canvas`; the active nav item
  uses `--sidebar-active` (a soft tint, never saturated).
- **Theme:** light/dark only, via the `.dark` class
  (`src/features/app-shell/use-theme.ts`). Light is the default. There is no
  palette switcher.
- shadcn components come first. Use `gap-*` (not `space-*`), `size-*` for
  squares, `truncate`, and `data-icon="inline-start|inline-end"` on icons
  inside buttons. Use semantic tokens and never raw Tailwind colours such as
  `bg-teal-500`.
- Don't add on-screen text that explains how the UI works.
- Check desktop and mobile (375px) layouts for UI work.

## Marketing site

Marketing lives in `src/features/marketing/`. Copy and SEO data are in
`landing-content.ts` and `alternatives-content.ts`, with snapshot-style tests.
Public routes are `/`, `/contact`, `/alternatives/$competitor`, `/privacy`, and
`/data-deletion`. When you add a public page, also add it to
`public/sitemap.xml`, give it canonical, OG, and Twitter meta via
`buildSocialImageMeta()`, and link it from `LandingFooter`.

## Engineering rules

- Make the smallest correct change. Avoid speculative abstraction and don't
  touch unrelated files.
- Keep commits focused, and branch off `main` (PRs to `main`).
- New tables need `company_id` (except public marketing tables), a Drizzle
  migration in `drizzle/`, and a matching in-memory repository for tests.
- Finish with focused checks: `bun run test`, `bun run lint`, `bun run build`.
  Report anything you could not run.

Public forms (waitlist in `LandingCta`, `LandingFeedback`, `ContactForm` on
the landing page and `/contact`) post to `marketing.*` public tRPC procedures.
They store rows in `marketing_submissions` (the one table without `company_id`)
and are guarded by a honeypot, Turnstile (when `VITE_TURNSTILE_SITE_KEY` and
`TURNSTILE_SECRET_KEY` are set) and a per-IP rate limit. Reuse
`useSpamGuard()` for any new public form.
