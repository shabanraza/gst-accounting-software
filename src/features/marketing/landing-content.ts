export const SITE = {
  name: 'HisaabKro',
  url: 'https://hisaabkro.in',
  githubUrl: 'https://github.com/shabanraza/gst-accounting-software',
  title: 'Free GST Billing & Accounting Software – HisaabKro',
  description:
    'Free GST billing and accounting software for Indian businesses: GST invoices, inventory, khata and GSTR reports on double-entry books. Import from Tally.',
  /** Absolute URL for Open Graph / Twitter cards (1200×630). */
  ogImage: 'https://hisaabkro.in/og-card.png',
} as const

/** Shared Open Graph + Twitter image tags for marketing pages. */
export function buildSocialImageMeta(imageUrl: string = SITE.ogImage) {
  return [
    { property: 'og:image', content: imageUrl },
    { property: 'og:image:width', content: '1200' },
    { property: 'og:image:height', content: '630' },
    { property: 'og:image:alt', content: SITE.title },
    { name: 'twitter:image', content: imageUrl },
  ] as const
}

/** Root-relative so the header works from /contact and /alternatives too. */
export const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#security', label: 'Security' },
  { href: '/#compare', label: 'Compare' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/tools', label: 'Free tools' },
  { href: '/changelog', label: 'Changelog' },
  { href: '/contact', label: 'Contact' },
] as const

export const HERO = {
  headline: 'Free GST billing and accounting software for Indian businesses',
  subhead:
    'GST invoices, inventory, khata and GST returns on real double-entry books. Fast at the counter, and moving from Tally takes minutes.',
  primaryCta: { label: 'Start free', to: '/signup' as const },
  secondaryCta: { label: 'View on GitHub', href: SITE.githubUrl },
  reassurance: 'Free to use · No credit card · Open source (MIT)',
} as const

export type Screenshot = {
  src: string
  width: number
  height: number
  alt: string
}

/** Real app screens, captured from a sample company on a test database. */
export const HERO_SCREENSHOT: Screenshot = {
  src: '/screenshots/dashboard.webp',
  width: 1920,
  height: 1109,
  alt: "HisaabKro dashboard showing sales this month, amounts to collect and pay, a to-do list with payment reminders and this month's GST",
}

export const HERO_CALLOUTS = [
  { icon: 'whatsapp', label: 'Payment reminder on WhatsApp' },
  { icon: 'gst', label: 'GSTR-3B net payable' },
  { icon: 'stock', label: 'Stock matches the books' },
] as const

export const TRUST_POINTS = [
  'Double-entry ledger',
  'Gapless invoice numbers',
  'Audit log',
  'Role-based team access',
  'Open source (MIT)',
] as const

export const SHOWCASE = {
  id: 'features',
  title: 'Everything a growing business runs on',
  subtitle:
    'Billing, stock, collections and GST in one place, all posting to the same books.',
  items: [
    {
      id: 'billing',
      eyebrow: 'Billing',
      title: 'GST invoices in seconds',
      body: 'Built for the counter: pick a party and items from the keyboard, and the tax splits itself by place of supply.',
      points: [
        'CGST, SGST and IGST worked out for every line',
        'Bill of supply for businesses without a GSTIN',
        'Gapless invoice numbers, even when two people bill at once',
        'Alt+S for a new invoice, F2 to save',
      ],
      screenshot: {
        src: '/screenshots/sales-invoice.webp',
        width: 1200,
        height: 950,
        alt: 'A GST tax invoice printed from HisaabKro with item lines, HSN codes, CGST and SGST split and the invoice total',
      },
    },
    {
      id: 'inventory',
      eyebrow: 'Inventory',
      title: 'Stock that matches your books',
      body: 'Every sale and purchase moves stock through a recorded movement, valued at what it actually cost you.',
      points: [
        'Weighted-average cost, so the balance sheet matches the stock report',
        'Reorder levels with low-stock alerts on the dashboard',
        'Godowns, HSN codes and units per item',
        'Import items and opening stock from Tally or Excel',
      ],
      screenshot: {
        src: '/screenshots/inventory.webp',
        width: 1400,
        height: 579,
        alt: 'HisaabKro stock screen listing items with quantity in stock, average cost and stock value',
      },
    },
    {
      id: 'collections',
      eyebrow: 'Collections',
      title: 'Get paid on time',
      body: 'See who owes you, who is overdue and by how much, then act on it in one tap.',
      points: [
        'Send a payment reminder on WhatsApp from any overdue customer',
        'Record receipts and payments against invoices and bills',
        'Receivable and payable ageing by party',
      ],
      screenshot: {
        src: '/screenshots/ageing.webp',
        width: 1400,
        height: 453,
        alt: 'HisaabKro receivables and payables ageing report grouped by how many days each amount is overdue',
      },
    },
    {
      id: 'gst',
      eyebrow: 'GST',
      title: 'GST returns from the same books',
      body: 'No re-entering figures into a separate tool. The returns come from the invoices and bills you already posted.',
      points: [
        'GSTR-1 and GSTR-3B summaries',
        'GSTR-2B reconciliation against purchase bills',
        'HSN summary and GST rate-wise totals',
      ],
      screenshot: {
        src: '/screenshots/hsn-summary.webp',
        width: 1400,
        height: 392,
        alt: 'HisaabKro HSN summary report with taxable value and GST for each HSN code',
      },
    },
  ],
} as const

export const PATHWAYS = [
  {
    title: 'Moving from Tally?',
    body: 'Import parties, stock items and opening stock from a Tally masters export (XML) or an Excel sheet.',
    cta: { label: 'Tally vs HisaabKro', to: '/alternatives/tally' as const },
  },
  {
    title: 'For CAs and accountants',
    body: 'Run several client companies, invite staff with roles, and work from GSTR-1, GSTR-3B and trial balance.',
    cta: { label: 'Start free', to: '/signup' as const },
  },
  {
    title: 'Open source',
    body: 'Read how every tax and ledger figure is worked out, self-host it, or contribute on GitHub.',
    cta: { label: 'View on GitHub', href: SITE.githubUrl },
  },
] as const

export const SECURITY = {
  id: 'security',
  title: 'Built to be trusted with your books',
  subtitle:
    'Accounting software has one job above all: the numbers must be right.',
  items: [
    {
      title: 'Books that always balance',
      body: 'Every invoice, bill and payment posts both sides of the entry in one database transaction. It saves completely or not at all.',
    },
    {
      title: 'Who did what, and when',
      body: 'An audit log records changes, and roles (owner, admin, accountant, billing, inventory, read-only) limit who can post or see reports.',
    },
    {
      title: 'Your data stays yours',
      body: 'Download a full company backup from Settings at any time, and request account deletion whenever you want.',
    },
    {
      title: 'Code you can inspect',
      body: 'The whole app is open source, so how GST, stock value and ledgers are calculated is visible to anyone.',
    },
  ],
} as const

export type FeatureTone =
  'money-in' | 'money-out' | 'gst' | 'inventory' | 'banking' | 'foreground'

export const FEATURES = {
  id: 'features',
  title: 'Everything that posts to the books',
  subtitle: 'One workspace for the work you do every day.',
  items: [
    {
      tone: 'money-in' as const,
      title: 'Sales',
      body: 'Tax invoices with place of supply, CGST/SGST/IGST split, and print-ready layout.',
    },
    {
      tone: 'money-out' as const,
      title: 'Purchases & GRN',
      body: 'Purchase bills, orders, and goods receipt — stock and payables stay in sync.',
    },
    {
      tone: 'gst' as const,
      title: 'GST & returns',
      body: 'HSN summary, GSTR-style reports, and GSTR-2B reconciliation against your books.',
    },
    {
      tone: 'inventory' as const,
      title: 'Inventory & godowns',
      body: 'Items with HSN, godowns, and stock that only moves through stock movements.',
    },
    {
      tone: 'banking' as const,
      title: 'Cash & bank',
      body: 'Receipts, payments, cash book, and bank reconciliation in one place.',
    },
    {
      tone: 'foreground' as const,
      title: 'Parties & ageing',
      body: 'Customers and suppliers with GSTIN, ledger balances, and receivable/payable ageing.',
    },
  ],
} as const

export const COMPARISON = {
  id: 'compare',
  title: 'How HisaabKro compares',
  subtitle:
    'Stable facts only — pricing model and how the software is delivered. Feature checklists go stale; these do not.',
  columns: [
    '',
    'HisaabKro',
    'Tally',
    'Busy',
    'Vyapar',
    'Zoho Books',
    'Marg',
    'myBillBook',
  ] as const,
  rows: [
    {
      label: 'Runs in a browser',
      values: [
        'Yes',
        'Desktop app',
        'Desktop app',
        'App / web',
        'Yes',
        'Desktop app',
        'App / web',
      ],
    },
    {
      label: 'Source code available',
      values: ['Yes (MIT)', 'No', 'No', 'No', 'No', 'No', 'No'],
    },
    {
      label: 'Self-hostable',
      values: [
        'Yes',
        'On-prem install',
        'On-prem install',
        'No',
        'No',
        'On-prem install',
        'No',
      ],
    },
    {
      label: 'Multi-company',
      values: [
        'Yes',
        'Yes',
        'Yes',
        'Plan-dependent',
        'Plan-dependent',
        'Yes',
        'Plan-dependent',
      ],
    },
    {
      label: 'Pricing model',
      values: [
        'Free & open source',
        'Paid license',
        'Paid license',
        'Subscription',
        'Subscription',
        'Paid license',
        'Subscription',
      ],
    },
  ],
} as const

export const FAQ = {
  id: 'faq',
  title: 'Frequently asked questions',
  items: [
    {
      question: 'Is HisaabKro free GST billing software?',
      answer:
        'Yes. HisaabKro is free to use and open source under the MIT licence. There is no licence fee and no credit card needed to sign up. You can also self-host it.',
    },
    {
      question: 'Can I move from Tally to HisaabKro?',
      answer:
        'Yes. Import your parties, stock items and opening stock from a Tally masters export (XML) or an Excel file, then continue billing in HisaabKro.',
    },
    {
      question: 'Does it make GST invoices and GSTR-1 and GSTR-3B?',
      answer:
        'Yes. Sales invoices split CGST, SGST and IGST by place of supply, and the GSTR-1 and GSTR-3B summaries, GSTR-2B reconciliation and HSN summary come from the same books.',
    },
    {
      question: 'Can I use it if my business has no GSTIN?',
      answer:
        'Yes. Businesses without a GSTIN bill without GST, and invoices print as a Bill of Supply instead of a Tax Invoice.',
    },
    {
      question: 'Where is my data stored?',
      answer:
        'On the hosted service, business data lives in PostgreSQL (Neon). We do not sell user data, and you can download a company backup at any time. See the privacy policy for details.',
    },
    {
      question: 'Can my accountant or staff use it too?',
      answer:
        'Yes. Run several companies under one account and invite people with roles such as accountant, billing, inventory or read-only.',
    },
    {
      question: 'Do I still need a CA?',
      answer:
        'For filing strategy, notices and advice, yes. HisaabKro keeps invoices, books and GST reports organised so your CA works from clean data.',
    },
  ],
} as const

export const CLOSING_CTA = {
  title: 'Start with a free workspace today',
  body: 'Create an account, set up your company, and post your first invoice — no license fee.',
  primaryCta: HERO.primaryCta,
  secondaryCta: HERO.secondaryCta,
} as const

export function buildFaqJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }
}

export function buildSoftwareJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE.name,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'INR',
    },
    description: SITE.description,
    url: SITE.url,
    image: SITE.ogImage,
  }
}

export const WAITLIST = {
  label: 'Email for product updates',
  placeholder: 'you@business.com',
  button: 'Get updates',
  success: "You're on the list. We'll email you when new features ship.",
} as const

export const FEEDBACK = {
  id: 'feedback',
  title: 'Tell us what to build next',
  subtitle:
    'Missing a report, a GST workflow, or a BUSY feature you rely on? We read every note.',
  ratingLabel: 'How useful is HisaabKro for your business?',
  messageLabel: 'Your feedback',
  messagePlaceholder: 'e.g. I need WhatsApp invoice sharing with a UPI QR code.',
  emailLabel: 'Email (optional, if you want a reply)',
  button: 'Send feedback',
  success: 'Thanks — your feedback reached the team.',
} as const

export const CONTACT = {
  id: 'contact',
  title: 'Talk to us',
  subtitle:
    'Questions about migrating from Tally or BUSY, GST setup, or self-hosting — send a message and a person replies.',
  pageTitle: 'Contact HisaabKro',
  pageDescription:
    'Contact the HisaabKro team about GST billing, migrating from Tally or BUSY, self-hosting, or partnerships.',
  responseTime: 'We reply within one business day.',
  topics: [
    { value: 'sales', label: 'Pricing & plans' },
    { value: 'support', label: 'Support' },
    { value: 'partnership', label: 'Partnership / CA firm' },
    { value: 'other', label: 'Something else' },
  ],
  button: 'Send message',
  success: "Message sent. We'll get back to you within one business day.",
} as const

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name,
    url: SITE.url,
    logo: `${SITE.url}/icon-512.png`,
    sameAs: [SITE.githubUrl],
  }
}
