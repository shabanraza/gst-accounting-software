# SEO growth plan — hisaabkro.in (2026-10-30)

## What Search Console says (last 90 days, 1 Aug – 28 Oct 2026)

| Metric | Value |
| --- | --- |
| Clicks | 21 |
| Impressions | 404 |
| CTR | 5.2% |
| Avg position | 6.7 |
| Indexed pages | 5 |
| Not indexed | 6 (5 "Discovered – currently not indexed", 1 canonical alternate) |

Top queries: `hi.busy.in` (155 impr), `hi busy` (41 impr, 1 click), `hi.busy` (35),
`hi busy.in` (18), `busywin accounting software`, `hisab karo`, `hisab rakho`,
`busy software alternative` (position 86).

Top pages: `/` (13 clicks), `/alternatives/busy` (6 clicks / 375 impr),
`/app/dashboard` (2), `/signup` (1), `/login` (16 impr).

### Reading

1. ~93% of impressions come from **BUSY's login portal** (`hi.busy.in`). That is
   navigational intent: people want to log in to BUSY, not switch. It will
   never convert well, and it hides the fact that we rank for almost nothing
   commercial.
2. Google has **found but not crawled** 5 of our pages. The site is too thin
   for Google to spend crawl budget on it. More useful, linked pages fix this.
3. `/app/dashboard` and `/login` are showing in search. App routes should be
   `noindex`.
4. Brand query `hisab karo` / `hisab rakho` already appears. The brand spelling
   "hisaab" vs "hisab" matters; use both in copy and meta.

## Quick fixes (do first, < 1 day)

- `noindex, nofollow` meta on `/app/*`, `/login`, `/signup`, `/onboarding`,
  password pages; add `Disallow: /app` to `robots.txt`.
- Request indexing in GSC for the 4 alternatives pages and `/contact`.
- Retitle `/alternatives/busy` toward commercial intent:
  "BUSY Accounting Software Alternative — Online, GST-Ready | HisaabKro"
  and add a small "Looking for BUSY login? Go to hi.busy.in" line so the
  navigational visitors bounce cleanly instead of hurting engagement.
- Add "Hisab Karo / Hisab Kitab app" variants to the home page meta description.

## Free tools (micro-SaaS) — the main traffic lever

Indian GST tool queries ("GST calculator", "GST invoice generator", "HSN code
finder", "GST number search") are high-volume, evergreen, and the incumbents
(ClearTax, Vyapar, RegisterKaro, Patron, Masters India) all use free tools as
the top of their funnel. Each tool is a public route under `/tools/*`, works
without signup, and ends with a "Save this in HisaabKro" CTA.

Ranked by (demand × fit with the product ÷ effort):

| # | Tool | Route | Why | Effort |
| --- | --- | --- | --- | --- |
| 1 | **GST calculator** (add/remove GST, CGST/SGST/IGST split, GST 2.0 slabs 0/5/18/40) | `/tools/gst-calculator` + `/tools/gst-calculator/18-percent` etc. | Highest-volume GST query; rate slabs changed under GST 2.0 so many pages are stale. Rate sub-pages give long-tail. | 1 day, pure client-side, reuse `decimal.js` |
| 2 | **Free GST invoice generator** (PDF, UPI QR, no signup, no watermark) | `/tools/gst-invoice-generator` | Strongest buying intent; we already have `voucher-print-builder` and `voucher-document-paper`. Natural upsell: "save & number it automatically". | 2–3 days |
| 3 | **HSN / SAC code finder with GST rate** | `/tools/hsn-code-finder` + `/hsn/{code}` pages | Thousands of programmatic long-tail pages (`hsn code for cotton shirt`). Needs a public HSN dataset. | 3–4 days |
| 4 | **GSTIN validator** (checksum + state + PAN decode, offline) | `/tools/gstin-validator` | Huge volume; checksum-only version needs no API. Full lookup needs a GSP/API later. | 0.5 day |
| 5 | **GST return due-date calendar** (GSTR-1, 3B, 9, CMP-08) by turnover/QRMP | `/tools/gst-due-dates` | Recurring monthly searches; good for email capture ("remind me"). | 1 day |
| 6 | **E-invoice / e-way bill applicability checker** | `/tools/e-invoice-applicability` | Turnover thresholds confuse SMEs; ties into the product's GST depth. | 0.5 day |
| 7 | **Khata / udhaar reminder message maker** (WhatsApp text in Hindi/English) | `/tools/payment-reminder` | Matches the "khata" angle and the `hisab` brand queries; shareable. | 0.5 day |

Rules for every tool page: unique H1 + 600–1000 words of genuinely useful
explanation (formula, examples, FAQ with `FAQPage` schema), canonical/OG via
`buildSocialImageMeta()`, entry in `public/sitemap.xml`, link from
`LandingFooter` and a `/tools` hub page. No fake testimonials or usage counts.

## Content pages (after tools 1–3)

- **Comparison / alternative pages** (already have 4): add
  `/alternatives/marg`, `/alternatives/mybillbook`, `/alternatives/khatabook`,
  and `/compare/tally-vs-busy` (people searching between two incumbents are
  actively choosing).
- **Use-case pages:** `/gst-billing-software-for/{kirana, pharmacy, hardware,
  textile, restaurant, distributor}` — each with the specific GST quirks of
  that trade, not a template swap.
- **Guides** (feed the tools): "GST 2.0 new rates list", "How to make a GST
  invoice (format + mandatory fields)", "CGST vs SGST vs IGST", "Composition
  scheme invoice format".

## Measuring

- GSC: track impressions for non-BUSY queries separately (filter out
  `busy`). Target: 50 non-branded queries with impressions within 60 days of
  shipping tools 1–3.
- GA4/PostHog: event `tool_used` and `tool_cta_clicked` per tool; signup
  attribution by landing page.
