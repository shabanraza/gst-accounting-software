# Routing And Auth Approach

## Product routes (canonical)

Do **not** use `/design/accounting/sidebar` as the main product URL. That path is a design prototype.

Canonical map:

| Path                             | Purpose                                                         |
| -------------------------------- | --------------------------------------------------------------- |
| `/`                              | Redirect → `/app/dashboard` (or `/login` when auth is enforced) |
| `/login`                         | Email/password sign-in                                          |
| `/signup`                        | Create account                                                  |
| `/onboarding`                    | First company setup (legal name, GST, FY, business type)        |
| `/app`                           | Authenticated shell layout (`AppShell` + `<Outlet />`)          |
| `/app/dashboard`                 | Owner dashboard                                                 |
| `/app/masters/chart-of-accounts` | Ledger masters                                                  |
| `/app/masters/companies`         | Multi-company management                                        |
| `/app/masters/parties`           | Customers / suppliers                                           |
| `/app/masters/items`             | Item master                                                     |
| `/app/sales`                     | Sales invoices                                                  |
| `/app/purchases`                 | Purchase bills                                                  |
| `/app/inventory`                 | Stock                                                           |
| `/app/reports`                   | GSTR / books reports                                            |
| `/app/settings`                  | Company and user settings                                       |

`/design/*` may redirect to `/app/dashboard` for compatibility only.

## Why `/app/...` instead of `/domain/dashboard`

- Short, stable, SaaS-standard prefix for the authenticated workspace.
- Clear split: public auth routes vs private app routes.
- File-based TanStack Router maps cleanly: `src/routes/app/*.tsx`.
- Company context is **state** (active `companyId`), not a URL tenant slug in v1. Multi-company switching stays in the sidebar.

Later optional: `/app/c/$companyId/dashboard` if deep-linking per firm is required.

## Auth flow

```text
Signup / Login (better-auth)
        │
        ▼
 Session cookie set
        │
        ▼
 Has company membership?
   │              │
  No             Yes
   │              │
   ▼              ▼
/onboarding   /app/dashboard
   │
   ▼
createWithSetup
 (company + COA + FY + owner role + audit)
   │
   ▼
/app/dashboard
```

### Server rules

- `publicProcedure` — health, login-adjacent reads only.
- `protectedProcedure` — requires better-auth session; `accountId` / `ownerUserId` come from `ctx.userId`, never from the client alone.
- Company-scoped mutations must also verify `company_memberships` for the active company (next hardening step).

### Client rules

- `/app` layout `beforeLoad` checks session; unauthenticated users go to `/login`.
- Active company id stored in cookie/local storage; validated against memberships.
- Sign out clears session and returns to `/login`.

## Storage / OCR stubs

- Document files: object storage adapter interface (`InMemoryObjectStorageAdapter` now, Cloudflare R2 later).
- OCR: drafts with confidence only; confirmation never posts ledgers until purchase-bill service is called explicitly.
