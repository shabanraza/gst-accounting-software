# Project Agent Instructions

## Package Manager

- Always use Bun for project commands.
- Use `bun run <script>` instead of `npm run <script>` or `pnpm run <script>`.
- Use `bunx --bun shadcn@latest ...` for shadcn CLI commands.
- Prefer the latest stable compatible versions of dependencies when adding or updating packages.
- App scripts run on Node.js through the repo runtime shim; keep `.nvmrc` current and prefer `nvm` for local Node management.
- Prefer machine-terminal execution for repo work and verification when available, especially for Bun, Node, Vite, Vitest, and Wrangler commands.
- Do not use `npm`, `pnpm`, or `npx` unless the user explicitly asks for them or Bun is unavailable and the user approves the fallback.

## Current App Setup

- Framework: TanStack Start with file-based TanStack Router.
- Runtime target: Cloudflare Workers via `@cloudflare/vite-plugin`.
- Database: PostgreSQL/Neon with Drizzle ORM.
- UI: shadcn/ui with Tailwind CSS v4.
- shadcn preset/style: `radix-mira`.
- Icon library: `lucide-react`.
- Import alias: `#/*`.
- Current app shell lives under `src/features/app-shell/`.

## Design And UI Rules

- Follow the current theme and design pattern already in the app.
- Preserve the shadcn `radix-mira` look unless the user explicitly requests a new preset or theme.
- Use shadcn/ui components first. Do not build custom UI primitives when a shadcn component exists.
- Keep route files thin; route files should compose feature components only.
- Put reusable product UI under feature folders such as `src/features/<feature-name>/components`.
- Use semantic design tokens and shadcn variants instead of raw color utility classes where possible.
- Use `Badge` for status chips, `Card` composition for cards, `Table` for tabular data, `Sidebar` for navigation, and `Chart`/Recharts for charts.
- Use lucide icons inside buttons with `data-icon="inline-start"` or `data-icon="inline-end"`.
- Use `gap-*`, not `space-y-*` or `space-x-*`.
- Use `size-*` for square dimensions.
- Use `truncate` for clipped text.
- Avoid visible explanatory text that describes how the UI works; build the UI so the workflow is direct.

## Accounting Product Rules

- This app is intended to become a general BUSY-like Indian accounting, inventory, GST, purchase, sales, and business operations SaaS.
- Every business table must be company-aware using `company_id`.
- Every accounting-impacting action must post through a central double-entry ledger engine.
- Sales, purchases, payments, returns, GST postings, and stock movements must use database transactions.
- GST amounts must be stored separately from inventory cost and party balances.
- Stock must change only through stock movement records.
- Invoice numbers must use safe sequence logic, never `COUNT(*) + 1`.
- OCR must create reviewable drafts and must not post accounting entries without user confirmation.
- UI route files must not contain accounting business logic.

## Skills And Process

- Use the `frontend-design` skill for frontend pages, app screens, dashboards, visual polish, or design-system work.
- Use the `shadcn` skill for shadcn/ui components, presets, component docs, component installation, or component composition.
- Use the relevant Superpowers skill when planning, debugging, TDD, writing implementation plans, or executing multi-step work.
- Use test-driven development for accounting/domain behavior: write the failing test first, verify it fails, implement the minimum code, then verify it passes.
- For documentation generation or roadmap work, keep docs in the `docs/` folder unless the user requests another location.

## Engineering Quality Rules

- Follow the Karpathy-style rule: make the smallest code change that correctly solves the problem.
- Avoid unnecessary abstraction, broad refactors, cleverness, or speculative architecture.
- Avoid duplicate code, repeated logic, and repeated UI patterns; extract a small shared helper/component only when duplication is real.
- Prefer simple, readable, boring code over clever code.
- Preserve existing behavior unless the user explicitly asks to change it.
- Do not touch unrelated files.
- Keep commits and patches focused on one purpose.
- When adding logic, place it in the correct domain/service layer instead of repeating it in UI components.

## Verification

- Prefer focused checks for the files changed.
- Use Bun commands:
  - `bun run lint`
  - `bun run test`
  - `bun run build`
- For UI work, verify desktop and mobile layout when possible.
- Before finishing, mention any verification that could not be run.
