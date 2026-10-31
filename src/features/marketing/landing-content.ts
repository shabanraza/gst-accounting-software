export const SITE = {
  name: 'HisaabKro',
  url: 'https://hisaabkro.in',
  githubUrl: 'https://github.com/shabanraza/gst-accounting-software',
  title: 'HisaabKro — Free GST billing & accounting for Indian business',
  description:
    'Free GST billing, sales, purchases, inventory, party ledgers, and GST returns in one keyboard-first workspace. Proper double-entry books. No license fee.',
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
  { href: '/#how-it-works', label: 'How it works' },
  { href: '/#compare', label: 'Compare' },
  { href: '/#faq', label: 'FAQ' },
  { href: '/contact', label: 'Contact' },
] as const

export const HERO = {
  headline: 'Free GST billing and accounting for Indian business.',
  subhead:
    'Sales, purchases, inventory, party ledgers, and GST returns in one workspace — with proper double-entry books underneath. Keyboard-first, so a full invoice takes seconds at the counter.',
  primaryCta: { label: 'Start free', to: '/signup' as const },
  secondaryCta: { label: 'View on GitHub', href: SITE.githubUrl },
  reassurance: 'No license fee. No credit card. Self-host it if you prefer.',
} as const

export const HOW_IT_WORKS = {
  id: 'how-it-works',
  title: 'From company setup to GST filing',
  subtitle: 'Three steps. The ledger stays balanced at every one of them.',
  steps: [
    {
      title: 'Set up your company',
      body: 'Enter GSTIN, state, and financial year. Chart of accounts is generated for you.',
    },
    {
      title: 'Bill and record',
      body: 'Sales invoices, purchase bills, payments — each posts double-entry automatically.',
    },
    {
      title: 'File with confidence',
      body: 'GSTR-1, GSTR-3B, HSN summary, and GSTR-2B reconciliation from the same books.',
    },
  ],
} as const

export const KEYBOARD_SPEED = {
  id: 'keyboard-speed',
  title: 'Built for the counter PC',
  subtitle:
    'Desktop-first voucher entry for people who left Tally and Busy for a reason — speed without the license fee.',
  shortcuts: [
    { keys: 'Tab / Enter', action: 'Move through line items' },
    { keys: '⌘K', action: 'Jump anywhere in the workspace' },
    { keys: 'Esc', action: 'Close preview without losing focus' },
  ],
} as const

export type FeatureTone =
  | 'money-in'
  | 'money-out'
  | 'gst'
  | 'inventory'
  | 'banking'
  | 'foreground'

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
  columns: ['', 'HisaabKro', 'Tally', 'Busy', 'Vyapar', 'Zoho Books'] as const,
  rows: [
    {
      label: 'Runs in a browser',
      values: ['Yes', 'Desktop app', 'Desktop app', 'App / web', 'Yes'],
    },
    {
      label: 'Source code available',
      values: ['Yes (MIT)', 'No', 'No', 'No', 'No'],
    },
    {
      label: 'Self-hostable',
      values: ['Yes', 'On-prem install', 'On-prem install', 'No', 'No'],
    },
    {
      label: 'Multi-company',
      values: ['Yes', 'Yes', 'Yes', 'Plan-dependent', 'Plan-dependent'],
    },
    {
      label: 'Pricing model',
      values: [
        'Free & open source',
        'Paid license',
        'Paid license',
        'Subscription',
        'Subscription',
      ],
    },
  ],
} as const

export const ROADMAP = {
  id: 'roadmap',
  title: 'On the roadmap',
  subtitle: 'Honest about what is not shipping yet.',
  items: [
    {
      title: 'OCR bill capture',
      body: 'Photograph a purchase bill and review extracted fields before posting. Review-and-post already exists; extraction is next.',
    },
    {
      title: 'Android companion app',
      body: 'Capture bills away from the counter. Desktop remains the daily workspace.',
    },
  ],
} as const

export const FAQ = {
  id: 'faq',
  title: 'Questions worth asking',
  items: [
    {
      question: 'Is HisaabKro really free?',
      answer:
        'Yes. The software is MIT-licensed open source. There is no license fee and no credit card required to sign up for the hosted app. You can also self-host on Cloudflare Workers and Neon.',
    },
    {
      question: 'Where is my data stored?',
      answer:
        'On the hosted service, business data lives in PostgreSQL (Neon). You control what you enter. We do not sell user data. See the privacy policy for details.',
    },
    {
      question: 'Can I self-host?',
      answer:
        'Yes. The recommended path is Cloudflare Workers for the app and Neon for PostgreSQL. The repository README covers setup and deploy.',
    },
    {
      question: 'Does it produce GSTR-1 and GSTR-3B?',
      answer:
        'Yes. You get GSTR-style reports, HSN summary, and GSTR-2B reconciliation from the same double-entry books that post your invoices and bills.',
    },
    {
      question: 'Can I run multiple companies?',
      answer:
        'Yes. Create multiple companies under one account, invite teammates with roles, and switch the active company from the workspace.',
    },
    {
      question: 'Do I still need a CA?',
      answer:
        'For filing strategy, notices, and advisory — yes, a CA remains valuable. HisaabKro keeps books, invoices, and GST reports organised so your CA works from clean data rather than chasing WhatsApp photos.',
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
