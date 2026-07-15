# GST Accounting Software (India) — Free & Open Source

Free, open-source **GST accounting software** for Indian businesses — sales invoicing, purchase bills, inventory, party ledger, payments, and **GST compliance** in one modern web app.

Looking for a **Busy accounting alternative**, **Zoho Books alternative**, or **Tally-style GST software** without license fees? This project is built for that.

Use it at no cost. Fork it, self-host it, or contribute back.

**Repository:** [github.com/shabanraza/gst-accounting-software](https://github.com/shabanraza/gst-accounting-software)

---

## What this software covers

| What people search for | Supported in this app |
|------------------------|------------------------|
| GST accounting software India | Sales, purchases, payments, double-entry books |
| GST billing software | Tax invoices with CGST, SGST, IGST |
| GST invoice software / tax invoice format | Rule 46 layout, HSN, amount in words |
| Busy accounting software alternative | Vouchers, parties, inventory, GST reports |
| Zoho Books GST alternative | Cloud web app, multi-user, multi-company |
| Tally ERP GST alternative | Ledger, chart of accounts, day book |
| Marg / Vyapar style billing | Sales bill, purchase bill, stock |
| Inventory with GST | Items, godowns, stock ledger, GRN |
| GSTR-1 / GSTR-2B / GST return help | HSN summary, GSTR reports, 2B reconciliation |
| Party ledger software | Customer & supplier balances, ageing |
| Free GST software | 100% free & open source — no license fee |

---

## Features

- **GST invoicing** — Tax invoices, place of supply, intra/inter-state GST split
- **Sales & purchases** — Invoices, bills, orders, goods receipt (GRN), returns
- **Inventory** — Items, HSN codes, godowns, stock movements
- **Accounting** — Double-entry ledger, chart of accounts, journal entries
- **Parties** — Customers & suppliers with GSTIN, ledger, ageing
- **Payments** — Receipts, payments, bank/cash book
- **GST reports** — HSN summary, GSTR-style reports, GSTR-2B reconciliation
- **Team & companies** — Multi-company, invites, roles
- **Modern UI** — Fast web app, mobile-friendly, light theme default

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | [React](https://react.dev), [TanStack Router](https://tanstack.com/router), [TanStack Query](https://tanstack.com/query) |
| UI | [shadcn/ui](https://ui.shadcn.com), [Tailwind CSS v4](https://tailwindcss.com) |
| API | [tRPC](https://trpc.io) |
| Auth | [Better Auth](https://www.better-auth.com) (email/password + Google) |
| Database | [PostgreSQL](https://www.postgresql.org) via [Neon](https://neon.tech) |
| ORM | [Drizzle ORM](https://orm.drizzle.team) |
| Runtime / deploy | [TanStack Start](https://tanstack.com/start) on [Cloudflare Workers](https://workers.cloudflare.com) |
| Package manager | [Bun](https://bun.sh) |

---

## How to use (quick start)

### 1. Clone the repo

```bash
git clone https://github.com/shabanraza/gst-accounting-software.git
cd gst-accounting-software
```

### 2. Install dependencies

```bash
bun install
```

Requires **Bun** and **Node.js** (see [.nvmrc](./.nvmrc)). Run `nvm use` before `bun run dev` if your shell is not already on that version.

### 3. Configure environment

```bash
cp .env.example .env.local
```

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon/PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth secret (`bunx @better-auth/cli secret`) |
| `BETTER_AUTH_URL` | Yes | `http://localhost:3000` locally |
| `GOOGLE_CLIENT_ID` | No | Google sign-in (optional) |
| `GOOGLE_CLIENT_SECRET` | No | Google sign-in (optional) |
| `RESEND_API_KEY` | No | Email (optional in dev) |

### 4. Set up the database

**Fresh database:**

```bash
bun run db:push
```

**Production / migrations:**

```bash
bun run db:generate
bun run db:migrate
```

### 5. Run locally

```bash
bun run dev
```

Open **http://localhost:3000**

### 6. First-time app flow

1. **Sign up** at `/signup` (or `/login`)
2. **Create a company** — GSTIN, state, financial year
3. **Add masters** — parties (customers/suppliers), items with HSN
4. **Create vouchers** — sales invoice, purchase bill, payment, journal
5. **View reports** — GST reports, ledger, ageing, stock

---

## Scripts

```bash
bun run dev          # Local dev server (port 3000)
bun run build        # Production build
bun run test         # Run tests (Vitest)
bun run lint         # ESLint
bun run db:push      # Push schema to DB (fresh setup)
bun run db:migrate   # Run migrations
bun run deploy       # Deploy to Cloudflare Workers
```

---

## Where to deploy

This app is designed for a **two-service** setup:

| Service | What to use | Role |
|---------|-------------|------|
| **App (frontend + API)** | [Cloudflare Workers](https://workers.cloudflare.com) | Hosts the TanStack Start app, SSR, tRPC, auth routes |
| **Database** | [Neon](https://neon.tech) PostgreSQL | Stores companies, vouchers, ledger, inventory, users |

**Do not** run PostgreSQL on the same machine as a long-lived Node server for production — Workers are serverless and need a remote HTTP-compatible database like Neon.

### Why Cloudflare Workers?

We chose Cloudflare as the default deploy target because it fits a **free, fast, India-friendly GST SaaS**:

| Benefit | Why it matters for GST accounting software |
|---------|---------------------------------------------|
| **Global edge network** | Pages load quickly for users across India (and abroad) |
| **Generous free tier** | Low cost to start; good for open-source self-hosters and small shops |
| **No server management** | No VPS, no patching Linux, no scaling cron — deploy and forget |
| **Built for this stack** | TanStack Start + Vite plugin deploys directly with Wrangler |
| **HTTPS by default** | `*.workers.dev` SSL included; custom domain supported |
| **Secrets management** | `DATABASE_URL`, auth secrets stored securely in dashboard |
| **Always on** | Unlike cold-start-heavy hobby hosts; suitable for daily billing use |

**Database on Neon:** Serverless Postgres with a free tier, works with Drizzle ORM and Cloudflare Workers over HTTP (no TCP from the edge).

### Alternatives (advanced)

You can adapt the stack, but **Cloudflare + Neon is the tested path** in this repo:

- **VPS + Node** — possible with TanStack Start Node adapter, but not the default `bun run deploy` flow
- **Other Postgres hosts** — any provider with a connection string works if reachable from Workers

---

## Deploy to production (Cloudflare + Neon)

### 1. Create a Neon database

1. Sign up at [neon.tech](https://neon.tech)
2. Create a project → copy the **PostgreSQL connection string**
3. Run migrations on that database:

```bash
bun run db:push    # fresh DB
# or
bun run db:migrate # after db:generate
```

### 2. Deploy the app to Cloudflare

```bash
wrangler login
bun run deploy
```

### 3. Set production secrets (Cloudflare dashboard)

Go to **Workers & Pages → your worker → Settings → Variables and secrets**:

| Secret | Example value |
|--------|-----------------|
| `DATABASE_URL` | `postgresql://...@....neon.tech/neondb?sslmode=require` |
| `BETTER_AUTH_SECRET` | Strong random string (use Secret type) |
| `BETTER_AUTH_URL` | `https://your-app.workers.dev` (your live Workers URL) |

Optional: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY`

### 4. Verify

- Open `https://your-app.workers.dev/login` — should load (not 500)
- Sign up → create company → post a test invoice

**Live example worker name:** `gst-accounting-software` (configure in `wrangler.jsonc`).

---

## Open source

Licensed under the [MIT License](./LICENSE).

This project is **free and open source**. Anyone can:

- Use it for personal or commercial business
- Self-host on their own Cloudflare + Neon stack
- Fork and customize
- Contribute improvements via pull requests

**Contributing:** Open an issue or PR on [GitHub](https://github.com/shabanraza/gst-accounting-software).

---

## Search keywords

GST accounting software India · GST billing software · free GST invoice software · Busy alternative · Zoho Books alternative · Tally GST alternative · Marg ERP alternative · Vyapar alternative · inventory accounting GST · GSTR-1 software · GSTR-2B reconciliation · HSN summary · tax invoice generator India · purchase bill software · sales invoice software · small business accounting India · open source accounting software · cloud GST software · billing software India

---

## Support

- **Issues:** [GitHub Issues](https://github.com/shabanraza/gst-accounting-software/issues)
- **Docs:** See `docs/` folder and [AGENTS.md](./AGENTS.md) for developer setup
