# Landing page and SEO plan

How the public site at hisaabkro.in moves from one landing page to a
product-led marketing site that ranks for what Indian businesses search, and
turns those visits into signups. Web only; the mobile app's store listing is
separate.

## Goals and how we measure them

| Goal | Measure | Where |
| --- | --- | --- |
| More people find us | Impressions and clicks for non-brand queries | Search Console → Performance |
| More of them click | Click-through rate per page and query | Search Console → Performance |
| More of them sign up | Signups per landing page | GA4 (`sign_up` event by landing page) |
| They stay | Users active again after their first day | Database query, as in the usage review |
| The site is fast | LCP < 2.5 s, CLS < 0.1, INP < 200 ms on mobile | Search Console → Core Web Vitals, PageSpeed Insights |

Before starting, export the last 3 months of Search Console Performance
(queries and pages) and keep it in `docs/` as the baseline. Every phase is
judged against it after 4–8 weeks, because rankings move slowly.

## Where we are today

- One landing page (`/`) with a split hero. The visual is two hand-built
  preview cards (`product-preview.tsx`), not the real app.
- Sections: how it works, keyboard speed, feature grid, comparison table,
  roadmap strip, FAQ, call to action.
- Server-rendered pages (TanStack Start), canonical URLs, Open Graph card,
  `SoftwareApplication` and `FAQPage` JSON-LD, `sitemap.xml`, `robots.txt`.
- Four comparison pages: `/alternatives/{tally,busy,vyapar,zoho-books}` with
  breadcrumb and FAQ JSON-LD.
- `/changelog` (from `CHANGELOG.md`), `/privacy`, `/data-deletion`.
- GA4 is wired (`src/integrations/google-analytics.tsx`).

The gap: almost every search an Indian business owner types ("gst billing
software", "billing software for shop", "hsn code", "gstr 3b due date") has
no page built for it, and the home page cannot rank for all of them.

## Rules that apply to every phase

- **Honest claims only.** No fake logos, testimonials, user counts, ratings or
  awards. Social proof is what is true: open source, GitHub stars, the
  changelog, the accounting guarantees (double-entry, audit log, gapless
  invoice numbers).
- **Don't overclaim data location or compliance.** The database is in Neon
  `us-east-2` today; say nothing about data in India until that changes.
- **No real customer data in screenshots.** Screenshots come from a clearly
  named demo company on a Neon test branch, never production (see
  "Screenshots" below).
- **Same design system as the app:** shadcn/ui `radix-mira`, teal, IBM Plex
  Sans, semantic tokens, `Card`, `Badge`, `Button`. Route files stay thin;
  content lives in `src/features/marketing/*-content.ts`.
- Every new public page goes into `sitemap.xml`, gets its own title,
  description, canonical and Open Graph tags, and a CHANGELOG line if it is a
  user-facing feature (for example a free tool).

---

## Phase 1: product-led home page

**Outcome:** a visitor understands what HisaabKro is and sees the real
product within one screen; the page loads fast on a phone.

### Layout (top to bottom)

1. **Header:** logo, Features, Solutions (dropdown of intent pages, from phase
   2), Changelog, GitHub, Sign in, **Start free**.
2. **Hero, centred:**
   - pill linking to the latest release: "New in v0.3.0: dashboard and Tally
     import →" (read from `RELEASES[0]`, so it updates itself);
   - H1 with the main phrase: "Free GST billing and accounting software for
     Indian businesses";
   - one benefit line: invoices, inventory, khata and GST returns on real
     double-entry books, move from Tally in minutes;
   - **Start free** and **Watch a 60-second demo** (a short screen recording,
     added when one exists; until then the second button is "View on GitHub");
   - trust line: no credit card, open source, GST-ready invoices.
3. **Hero screenshot:** the real dashboard in a browser frame, full content
   width, with two or three small floating callouts ("Payment reminder sent",
   "GSTR-3B net payable", "Stock matches the books"). Light and dark variants.
4. **Trust strip:** double-entry ledger · audit log · role-based access · open
   source · GitHub stars (fetched at build time or shown without a number).
5. **Feature sections, alternating text and screenshot:**
   - GST invoices in seconds (keyboard-first entry, CGST/SGST/IGST split,
     bill of supply for unregistered businesses);
   - stock that matches the books (weighted-average cost, low-stock alerts,
     godowns);
   - get paid faster (WhatsApp reminders, receipts, top dues);
   - GST returns from the same books (GSTR-1, GSTR-3B working, GSTR-2B
     reconciliation, HSN summary).
6. **Three cards:** Move from Tally (XML and Excel import) · For CAs and
   accountants (reports, exports, multiple companies) · Free GST tools (phase 2).
7. **Security and reliability:** what happens to the user's data, backups and
   export, permissions, audit log, open source code. Plain language, true
   statements only.
8. **Comparison table** (keep), **FAQ** (keep, rewrite answers around real
   search questions), **final call to action**.
9. **Footer:** product, solutions, free tools, guides, compare, company
   (changelog, privacy, GitHub). These links are the internal linking that
   helps new pages rank.

Remove the roadmap strip from the home page; the changelog now does that job
with real releases.

### Screenshots

- Make a demo company on a Neon branch of `accounting-dev` named
  "Demo Traders (sample)". Enter plausible but clearly fictional parties and
  items by hand through the app. This data never touches production.
- Capture at 1440×900 and 390×844, light and dark, with a fixed dashboard date.
- Export as WebP (and AVIF if the build handles it), under ~150 KB for the
  hero. Serve from `public/screenshots/` with explicit `width`/`height`.
- Re-capture when the UI changes noticeably; keep the capture steps in this
  doc so anyone can redo them.

How the current set (October 2026) was made:

1. Create a Neon branch of `accounting-dev` and point a local dev server at
   it. Never production.
2. Sign up a throwaway account on that branch and create "Demo Traders
   (sample)" with the dummy GSTIN `27AAAAA0000A1Z5` and a sample address.
3. Enter fictional parties, six electrical items, purchase bills, sales
   invoices, receipts, supplier payments and an opening-capital journal
   through the app's own API (the same tRPC calls the screens make), so every
   figure goes through the normal posting rules.
4. Capture at 1440×900 CSS px, 2× density, light theme, using headless Edge
   over the DevTools protocol.
5. Crop each screen to the useful area, export WebP at quality 80 with `sharp`
   (full size plus an `-800.webp` copy for phones), and update the sizes in
   `landing-content.ts`. A test checks that every screenshot and its phone
   copy exist.
6. Delete the Neon branch afterwards.

Current files: `dashboard` (hero), `sales-invoice` (printed tax invoice),
`inventory`, `ageing`, `hsn-summary`.

### Performance

- The hero image is the Largest Contentful Paint element: `fetchpriority="high"`,
  no lazy loading, correct `sizes`. Everything below the fold is lazy.
- No carousel, no autoplay video in the hero, no new animation library.
- Keep the marketing route out of the app bundle; check with
  `bun run check:bundle`.

### Titles and descriptions

| Page | Title (≤ 60 chars) | Description (≤ 155 chars) |
| --- | --- | --- |
| `/` | Free GST Billing & Accounting Software – HisaabKro | GST invoices, inventory, khata and GST returns on double-entry books. Free and open source. Import from Tally. Start in 2 minutes. |
| `/changelog` | Changelog – What's New in HisaabKro | Every new feature, improvement and fix in HisaabKro, the free GST billing and accounting app, release by release. |

Rewrite titles from Search Console data: queries with high impressions and
low CTR get their words into the title first.

### Structured data

- Keep `SoftwareApplication` with `offers.price = 0` and `priceCurrency = INR`,
  `operatingSystem`, `applicationCategory = BusinessApplication`.
- Add `Organization` (name, url, logo, `sameAs` GitHub and LinkedIn).
- Keep `FAQPage`, but don't expect FAQ rich results: Google limited them to a
  few authoritative sites in 2023.
- No `AggregateRating` until there are real reviews on a third-party site.

### Done when

- Home page matches the layout above at 1440 px and 375 px, light and dark.
- Lighthouse mobile performance ≥ 90 and SEO = 100 on `/`.
- Rich Results Test passes for `SoftwareApplication` and `Organization`.
- Tests cover the content files (titles, JSON-LD) like the existing
  `landing-content.test.ts`.

---

## Phase 2: intent pages and free tools

**Outcome:** pages that each match one search, linked from the header and
footer.

### Intent pages

One template (`src/features/marketing/components/solution-page.tsx`), content
in `solutions-content.ts`, route `src/routes/solutions/$slug.tsx`, same
pattern as `/alternatives/$competitor`.

Starting list (confirm against Search Console and Google Keyword Planner
before writing; volumes are not assumed here):

| Slug | Main phrase |
| --- | --- |
| `gst-billing-software` | GST billing software |
| `free-billing-software` | free billing software for small business |
| `inventory-management-software` | inventory software with GST |
| `khata-app` | khata / ledger app for business |
| `retail-shop-billing` | billing software for retail shop |
| `wholesale-distribution` | billing software for wholesale and distribution |
| `textile-business` | billing software for textile business |
| `for-accountants` | accounting software for CAs and accountants |

Each page: H1 with the phrase, the problem in the user's words, three to five
features with screenshots, a "Move from Tally/Busy" block, three FAQs from
real search questions, CTA, and links to two related pages and one guide.
At least 600 words of useful, specific text; no near-duplicate pages with
only the trade name swapped.

### Free tools

Client-side tools under `/tools/*`, no signup needed, each ending with
"Make this a GST invoice in HisaabKro →":

1. **GST calculator** (add or remove GST, CGST/SGST vs IGST split).
2. **HSN/SAC code finder** (search by item name; data from the official CBIC
   list, cited, kept in the repo).
3. **GSTIN validator** (format and checksum only; no lookup of other people's
   details).
4. **Invoice number / due-date helpers** only if Search Console shows demand.

The domain logic for 1–3 already exists in the app; reuse it (TDD for anything
new), don't copy it.

### Done when

- Pages in the sitemap and submitted in Search Console (URL inspection →
  request indexing).
- Each page has unique title, description, H1, canonical, breadcrumb JSON-LD.
- Tools work without JavaScript errors on mobile and have unit-tested logic.

---

## Phase 3: guides, Hindi, and links from other sites

**Outcome:** steady non-brand traffic and authority.

### Guides (`/guides/*`)

Practical, accurate how-tos tied to features, reviewed against the CGST rules
or GSTN help pages and dated:

- GSTR-1 and GSTR-3B due dates (monthly and QRMP)
- How to file GSTR-3B from your books
- Bill of supply vs tax invoice
- E-invoice: who needs it and the turnover limits
- Moving from Tally to HisaabKro, step by step

Each guide shows a "last reviewed" date and is updated when the law changes.
`Article` JSON-LD with author and date.

### Hindi

Hindi versions of the home page and the top three intent pages under `/hi/…`
with `hreflang` (`en-IN`, `hi-IN`, `x-default`). Written by a fluent speaker,
not machine-translated as-is.

### Links and listings

- GitHub README: live link, screenshots, changelog link.
- Listings: AlternativeTo (as a Tally/Vyapar alternative), SaaSHub, Product
  Hunt launch, G2 and Capterra India once there are real users to review.
- Write-ups: "How we built gapless invoice numbers on Postgres", "Double-entry
  in TypeScript" on dev.to / Hashnode, linking back. These also fit the
  LinkedIn posts that performed best.

### Done when

- Five guides published and indexed.
- Hindi pages indexed with correct `hreflang` (Search Console international
  targeting shows no errors).
- At least five relevant sites link to hisaabkro.in.

---

## Ongoing (monthly, 30 minutes)

1. Search Console → Performance: new queries, pages that dropped, queries with
   high impressions and CTR under 2% (rewrite their titles).
2. Pages at positions 8–20: add a section, a screenshot or internal links.
3. Core Web Vitals report: fix any page marked poor.
4. Coverage/Indexing report: fix "crawled, not indexed" pages (usually thin
   content or duplicates).
5. Each release: the changelog updates itself; add a line to the matching
   intent page if a feature changes what it promises.

## Risks

- **Thin or duplicate pages** hurt the whole site. Fewer, better pages win.
- **Outdated tax content** is worse than none. Every guide has an owner and a
  review date.
- **Heavy hero media** can make the page slower and rank worse. The image
  budget is part of "done".
- **Claims that drift from the product.** Content files reference features
  that exist; a marketing PR that promises something new needs the feature
  shipped first.
