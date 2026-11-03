# HisaabKro — GST Billing & Khata App

HisaabKro is a modern **GST billing, khata ledger, and accounting app** for Indian businesses — sales invoicing, purchase bills, inventory, party ledger, payments, and **GST compliance** in one web and mobile workspace.

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
| Barcode billing software | Item barcodes, label printing, scan-to-bill |
| GSTR-1 / GSTR-2B / GST return help | GSTR-1 portal JSON, GSTR-3B, HSN summary, 2B reconciliation |
| Tally to cloud migration | Import Tally masters XML, Excel and BUSY files |
| AI accounting assistant | Ask your books questions in Hindi or English |
| Party ledger software | Customer & supplier balances, ageing |
| Free GST software | 100% free & open source — no license fee |

---

## Features

- **GST invoicing** — Tax invoices, place of supply, intra/inter-state GST split; Bill of Supply for companies without a GSTIN
- **Sales & purchases** — Invoices, bills, quotations, orders, delivery challans, goods receipt (GRN), returns with credit/debit notes; keyboard-first entry
- **Gap-free numbering** — Invoices, notes and sales documents run in their own series per financial year (INV-0001, CN-0001, DN-0001, QT-0001…)
- **Inventory** — Items, HSN codes, godowns, stock movements, reorder levels and low-stock alerts, moving weighted-average stock value
- **Barcodes** — Enter a product's EAN/UPC or get an in-store code, print labels (A4 sheet or label roll), and scan onto sales and purchase bills
- **Accounting** — Double-entry ledger, chart of accounts, journal entries, opening balances
- **Parties** — Customers & suppliers with GSTIN, ledger, ageing, WhatsApp payment reminders
- **Payments** — Receipts, payments, bank/cash book, bank reconciliation
- **GST returns** — GSTR-1 laid out as on the portal (B2B, B2C large/small, credit notes, HSN summary, documents issued) with JSON download and portal-file comparison; GSTR-3B by return period; GSTR-2B reconciliation
- **Ask your books (AI)** — Ask in Hindi or English ("GST payable this month?") and get the figure from your own data with a link to the report
- **Dashboard** — Sales, receivables, payables, cash and bank, GST card with filing dates, top dues, setup checklist
- **Import** — Tally masters XML, Excel (.xlsx), CSV and BUSY files for parties, items and opening stock
- **Team & companies** — Multi-company, invites, roles
- **Modern UI** — Fast web app, mobile-friendly, light theme default

See [CHANGELOG.md](./CHANGELOG.md) for what changed in each release.

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
| `VITE_ENABLE_GOOGLE_AUTH` | No | Google buttons show by default; `false` hides them (build-time) |
| `RESEND_API_KEY` | No | Email (optional in dev) |

#### Enabling Google sign-in

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
   create an **OAuth 2.0 Client ID** of type *Web application*.
2. Add an authorised redirect URI of `<BETTER_AUTH_URL>/api/auth/callback/google`
   — `http://localhost:3000/api/auth/callback/google` for local dev, plus your
   deployed URL for production.
3. Put the client ID/secret in `.env.local`. The buttons are already visible —
   they show by default so a fresh clone needs no extra flag.
4. For production, set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` as
   Cloudflare Worker secrets.

Until the two secrets are set the buttons still render, and clicking one shows
a "Google sign-in is unavailable" toast rather than failing silently.

#### Hiding the Google buttons

`VITE_ENABLE_GOOGLE_AUTH=false` hides them. Vite inlines it at build time, so a
Cloudflare Worker secret will not work — it has to be set for the build:

```bash
VITE_ENABLE_GOOGLE_AUTH=false bun run build
```

`bun run deploy` already does this, so the deployed Worker ships without the
buttons. If you deploy some other way (Cloudflare Workers Builds, or your own
CI), set `VITE_ENABLE_GOOGLE_AUTH=false` as a build-time variable there too.

`VITE_GA_MEASUREMENT_ID` and `VITE_GOOGLE_SITE_VERIFICATION` are build-time
vars too — see [SEO, Google Analytics, and Search Console](#seo-google-analytics-and-search-console).

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

`bun run deploy` builds with the Google buttons hidden. To show them on the
deployed app, run `bun run build && wrangler deploy` instead of `bun run deploy`
— the Google secrets above have no effect on their own, because the toggle is
inlined into the client bundle at build time.

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

GST accounting software India · GST billing software · free GST invoice software · barcode billing software · GSTR-1 JSON · Busy alternative · Zoho Books alternative · Tally GST alternative · Marg ERP alternative · Vyapar alternative · inventory accounting GST · GSTR-1 software · GSTR-2B reconciliation · HSN summary · tax invoice generator India · purchase bill software · sales invoice software · small business accounting India · open source accounting software · cloud GST software · billing software India

---

## SEO, Google Analytics, and Search Console

The homepage (`/`) targets the primary keywords above. Four dedicated pages
target competitor-alternative search intent without duplicating the
homepage's keywords: `/alternatives/tally`, `/alternatives/busy`,
`/alternatives/vyapar`, `/alternatives/zoho-books`. Both `/` and the
alternative pages ship meta tags, Open Graph/Twitter tags, canonical URLs,
and `SoftwareApplication`/`FAQPage`/`BreadcrumbList` JSON-LD. `public/robots.txt`
and `public/sitemap.xml` list every public page.

### Google Analytics 4

Set `VITE_GA_MEASUREMENT_ID` to enable it — it is a **build-time** var like
`VITE_ENABLE_GOOGLE_AUTH`, blank by default so local dev and fresh clones ship
with zero analytics script:

```bash
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX bun run build
```

The measurement ID comes from a GA4 property at
[analytics.google.com](https://analytics.google.com) (Admin → Data Streams →
Web). Page views are sent manually on every route change, since the app is a
client-side router.

### Google Search Console

1. Add the property for `https://hisaabkro.in` at
   [search.google.com/search-console](https://search.google.com/search-console).
2. Choose the **HTML tag** verification method and copy the `content="..."`
   value (not the whole tag).
3. Set `VITE_GOOGLE_SITE_VERIFICATION` to that value and rebuild/deploy —
   also a build-time var:

   ```bash
   VITE_GOOGLE_SITE_VERIFICATION=your-verification-value bun run build
   ```
4. Once verified, submit `https://hisaabkro.in/sitemap.xml` under **Sitemaps**.

---

## Support

- **Issues:** [GitHub Issues](https://github.com/shabanraza/gst-accounting-software/issues)
- **Docs:** See `docs/` folder and [AGENTS.md](./AGENTS.md) for developer setup
