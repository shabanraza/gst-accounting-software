import { COMPARISON, SITE } from '#/features/marketing/landing-content.ts'

export const ALTERNATIVE_SLUGS = [
  'tally',
  'busy',
  'vyapar',
  'zoho-books',
  'marg',
  'mybillbook',
] as const

export type AlternativeSlug = (typeof ALTERNATIVE_SLUGS)[number]

interface AlternativeFaqItem {
  question: string
  answer: string
}

interface Alternative {
  slug: AlternativeSlug
  name: string
  seoTitle: string
  seoDescription: string
  headline: string
  intro: string
  faq: [AlternativeFaqItem, AlternativeFaqItem]
  /** For searchers who land here looking for the competitor's own login. */
  loginNotice?: { label: string; href: string }
}

/**
 * Pulls a stable fact straight from the comparison table so alternative
 * pages never drift out of sync with the numbers shown on `/`.
 */
export function comparisonFact(rowLabel: string, competitorName: string): string {
  const row = COMPARISON.rows.find((candidate) => candidate.label === rowLabel)
  const columnIndex = COMPARISON.columns.indexOf(
    competitorName as (typeof COMPARISON.columns)[number],
  )
  if (!row || columnIndex < 1) {
    throw new Error(`Unknown comparison row/column: ${rowLabel}/${competitorName}`)
  }
  return row.values[columnIndex - 1] ?? ''
}

const ALTERNATIVES_LIST: Array<Alternative> = [
  {
    slug: 'tally',
    name: 'Tally',
    seoTitle: `Tally alternative — Free, browser-based GST accounting | ${SITE.name}`,
    seoDescription:
      'Switching off Tally? HisaabKro runs in the browser, is free and open source, and covers GST billing, inventory, and party ledgers.',
    headline: 'A Tally alternative that runs in the browser, not just on the counter PC',
    intro:
      'Tally is a Windows desktop application with a paid, renewable license and no published source code. HisaabKro is the opposite on every one of those points: it runs in any browser, ships as MIT-licensed open source, and can be self-hosted on Cloudflare Workers and Neon if you would rather not use the hosted version. Sales, purchases, inventory, party ledgers, and GST returns work the same way either way.',
    faq: [
      {
        question: 'Can I import my existing Tally data into HisaabKro?',
        answer:
          'Not yet — there is no automated Tally import tool today. You set up your company fresh (GSTIN, state, financial year) and enter opening balances for parties and stock.',
      },
      {
        question: 'Does HisaabKro work offline like Tally?',
        answer:
          'No. HisaabKro is a browser-based, always-online workspace. If you self-host it, it runs on your own infrastructure, but it is still a web app, not an offline desktop program.',
      },
    ],
  },
  {
    slug: 'busy',
    name: 'Busy',
    seoTitle: `BUSY accounting software alternative — online, GST-ready, free | ${SITE.name}`,
    seoDescription:
      'Looking for a BUSY accounting software alternative that runs online? HisaabKro is free, open source, and self-hostable, with GST billing, GRN, and party ledgers in the browser.',
    loginNotice: {
      label: 'Looking for the BUSY login? Go to hi.busy.in',
      href: 'https://hi.busy.in',
    },
    headline: 'A Busy accounting software alternative without the annual license renewal',
    intro:
      'Like Tally, Busy is an on-premise desktop install sold under a paid license. HisaabKro has no license fee: it is free to use as a hosted app, its source code is published under MIT, and you can self-host it on Cloudflare Workers and Neon. The same voucher-entry speed carries over — sales, purchase bills, goods receipt, and GST reports all post to one double-entry ledger.',
    faq: [
      {
        question: 'Can I import my existing Busy data into HisaabKro?',
        answer:
          'Not yet — there is no automated Busy import tool today. You set up your company fresh and enter opening balances for parties and stock.',
      },
      {
        question: 'Does HisaabKro support multiple companies like Busy?',
        answer:
          'Yes. Create multiple companies under one account, invite teammates with roles, and switch the active company from the workspace — no plan upgrade required.',
      },
    ],
  },
  {
    slug: 'vyapar',
    name: 'Vyapar',
    seoTitle: `Vyapar alternative — Free GST billing, no subscription | ${SITE.name}`,
    seoDescription:
      'A Vyapar alternative for GST billing and inventory with no subscription fee — self-host it or use the free hosted workspace.',
    headline: 'A Vyapar alternative with no subscription and no plan-gated features',
    intro:
      "Vyapar is billed as a subscription, and features like multi-company support are plan-dependent. HisaabKro's core workflow — sales, purchases, GRN, inventory with godowns, and GST returns — is free on every account, with multi-company included from the start. It runs in the browser rather than as a phone-first app, and it is open source if you want to self-host.",
    faq: [
      {
        question: 'Can I import my existing Vyapar data into HisaabKro?',
        answer:
          'Not yet — there is no automated Vyapar import tool today. You set up your company fresh and enter opening balances for parties and stock.',
      },
      {
        question: 'Is HisaabKro mobile-friendly like the Vyapar app?',
        answer:
          "HisaabKro is a desktop-first, keyboard-driven browser workspace. It is usable on a phone browser, but the counter-PC voucher entry — the thing it's optimised for — is built for a keyboard.",
      },
    ],
  },
  {
    slug: 'zoho-books',
    name: 'Zoho Books',
    seoTitle: `Zoho Books GST alternative — Free & open source | ${SITE.name}`,
    seoDescription:
      'A Zoho Books alternative for Indian GST billing that is free, open source, and self-hostable — no per-user subscription.',
    headline: 'A Zoho Books alternative built specifically around Indian GST billing',
    intro:
      'Zoho Books is a general cloud accounting product sold on a subscription, with multi-company support depending on the plan. HisaabKro is purpose-built around the Indian GST billing workflow — CGST/SGST/IGST invoices, HSN summaries, GSTR-2B reconciliation — and is free and open source rather than subscription-based, with multi-company included on every account.',
    faq: [
      {
        question: 'Can I import my existing Zoho Books data into HisaabKro?',
        answer:
          'Not yet — there is no automated Zoho Books import tool today. You set up your company fresh and enter opening balances for parties and stock.',
      },
      {
        question: 'Is HisaabKro free the way Zoho Books free plan is?',
        answer:
          "Zoho Books' free plan is limited by invoice count and revenue. HisaabKro's core billing, inventory, and GST reporting workflow has no license fee and no such usage cap.",
      },
    ],
  },
  {
    slug: 'marg',
    name: 'Marg',
    seoTitle: `Marg ERP alternative — Free online GST billing software | ${SITE.name}`,
    seoDescription:
      'A Marg ERP alternative for GST billing, inventory, and accounts that runs in the browser — no paid license, no counter-PC install, and open source.',
    headline: 'A Marg ERP alternative that runs in the browser, not on one counter PC',
    intro:
      'Marg ERP is a Windows desktop install sold as a paid license in several editions. HisaabKro has no license fee and nothing to install: open it in any browser, invite your accountant with a role, and keep sales, purchases, godown stock, and GST reports on one double-entry ledger. The source is published under MIT if you would rather self-host it.',
    faq: [
      {
        question: 'Can I import my existing Marg data into HisaabKro?',
        answer:
          'Not yet — there is no automated Marg import tool today. You set up your company fresh and enter opening balances for parties and stock.',
      },
      {
        question: 'Does HisaabKro track batches and expiry dates like Marg?',
        answer:
          'Not today. HisaabKro tracks items with HSN codes across godowns, but batch and expiry tracking are not built yet. If your business depends on them, tell us through the contact page.',
      },
    ],
  },
  {
    slug: 'mybillbook',
    name: 'myBillBook',
    seoTitle: `myBillBook alternative — Free GST billing with double-entry books | ${SITE.name}`,
    seoDescription:
      'A myBillBook alternative with no yearly subscription: GST invoices, purchases, godown inventory, and proper double-entry accounts in one free workspace.',
    headline: 'A myBillBook alternative with no yearly plan and real double-entry books',
    intro:
      "myBillBook is sold as a yearly subscription, and the number of businesses and users depends on the plan. HisaabKro's billing, purchases, inventory, and GST reports are free on every account, with multiple companies and teammates included. Every invoice posts to a double-entry ledger, so your accountant gets a trial balance and party ledgers without re-entering anything.",
    faq: [
      {
        question: 'Can I import my existing myBillBook data into HisaabKro?',
        answer:
          'Not yet — there is no automated myBillBook import tool today. You set up your company fresh and enter opening balances for parties and stock.',
      },
      {
        question: 'Is there a HisaabKro phone app like myBillBook?',
        answer:
          'HisaabKro is a browser workspace built for a keyboard at the counter. It opens in a phone browser, and an Android companion app is on the roadmap.',
      },
    ],
  },
]

export const ALTERNATIVES: Record<AlternativeSlug, Alternative> = Object.fromEntries(
  ALTERNATIVES_LIST.map((alternative) => [alternative.slug, alternative]),
) as Record<AlternativeSlug, Alternative>

export function getAlternative(slug: string): Alternative | undefined {
  return ALTERNATIVES[slug as AlternativeSlug]
}

export function buildAlternativeFaqJsonLd(alternative: Alternative) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: alternative.faq.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildAlternativeBreadcrumbJsonLd(alternative: Alternative) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE.url}/` },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Alternatives',
        item: `${SITE.url}/alternatives`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: alternative.name,
        item: `${SITE.url}/alternatives/${alternative.slug}`,
      },
    ],
  }
}