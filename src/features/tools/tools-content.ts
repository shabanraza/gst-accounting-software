import { SITE } from '#/features/marketing/landing-content.ts'
import type { ContentSection, FaqItem } from '#/features/marketing/page-head.ts'

export const TOOL_SLUGS = [
  'gst-calculator',
  'gst-invoice-generator',
  'hsn-code-finder',
  'gstin-validator',
  'gst-due-dates',
  'e-invoice-e-way-bill-checker',
  'payment-reminder',
] as const

export type ToolSlug = (typeof TOOL_SLUGS)[number]

export type ToolTone = 'money-in' | 'money-out' | 'gst' | 'inventory' | 'banking'


export type Tool = {
  slug: ToolSlug
  name: string
  tone: ToolTone
  summary: string
  seoTitle: string
  seoDescription: string
  headline: string
  intro: string
  sections: ReadonlyArray<ContentSection>
  faq: ReadonlyArray<FaqItem>
  /** What the same job looks like inside HisaabKro. */
  productPitch: string
}

const TOOL_LIST: ReadonlyArray<Tool> = [
  {
    slug: 'gst-calculator',
    name: 'GST calculator',
    tone: 'gst',
    summary: 'Add or remove GST at 5%, 18%, 40% and other slabs, with the CGST/SGST or IGST split.',
    seoTitle: `GST Calculator India 2026 — Add or Remove GST, CGST/SGST Split | ${SITE.name}`,
    seoDescription:
      'Free GST calculator for the new GST slabs (5%, 18%, 40%). Add GST to a price or remove it from an inclusive amount, with the CGST, SGST, and IGST split.',
    headline: 'GST calculator: add or remove GST in one step',
    intro:
      'Type an amount, pick the GST rate, and choose whether the amount already includes tax. The calculator shows the taxable value, the GST, and how it splits between CGST and SGST for a sale inside your state, or IGST for a sale to another state.',
    sections: [
      {
        heading: 'How GST is calculated',
        paragraphs: [
          'Adding GST (exclusive amount): GST = taxable value × rate ÷ 100, and the invoice total is taxable value + GST. On ₹1,000 at 18%, GST is ₹180 and the total is ₹1,180.',
          'Removing GST (inclusive amount): taxable value = inclusive amount × 100 ÷ (100 + rate), and GST is the difference. On ₹1,180 at 18%, the taxable value is ₹1,000 and GST is ₹180.',
          'Amounts are rounded to the paisa. When the GST has an odd paisa, CGST takes the extra paisa so CGST + SGST always equals the total GST exactly.',
        ],
      },
      {
        heading: 'CGST, SGST, and IGST',
        paragraphs: [
          'If the supplier and the place of supply are in the same state, the tax is split equally into Central GST (CGST) and State GST (SGST, or UTGST in a union territory). At 18%, that is 9% CGST and 9% SGST.',
          'If the place of supply is in another state, the whole tax is charged as Integrated GST (IGST). At 18%, that is 18% IGST.',
        ],
      },
      {
        heading: 'GST slabs after September 2025',
        paragraphs: [
          'From 22 September 2025, most goods and services fall into two main slabs: 5% and 18%. A 40% rate applies to a short list of luxury and sin goods. Most items that were at 12% moved to 5%, and most items at 28% moved to 18%.',
          'Special rates continue for a few categories, such as 3% on gold and jewellery and 0.25% on rough diamonds. Some goods and services are exempt or nil-rated. Always confirm the rate for your HSN or SAC code in the CBIC rate notifications before you bill.',
        ],
      },
    ],
    faq: [
      {
        question: 'How do I calculate GST from a total amount?',
        answer:
          'Divide the total by (1 + rate ÷ 100) to get the taxable value, then subtract it from the total to get the GST. For ₹1,180 at 18%: 1,180 ÷ 1.18 = ₹1,000 taxable value, so GST is ₹180.',
      },
      {
        question: 'Is the 12% and 28% GST slab still in use?',
        answer:
          'For most goods and services, no. The rate rationalisation effective 22 September 2025 merged most 12% items into 5% and most 28% items into 18%, and added a 40% rate for a short list of goods. Check the notification for your specific item.',
      },
      {
        question: 'When do I charge IGST instead of CGST and SGST?',
        answer:
          'Charge IGST when the place of supply is in a different state or union territory from your registration. Charge CGST + SGST (or UTGST) when both are in the same state.',
      },
    ],
    productPitch:
      'In HisaabKro the rate comes from the item master and the CGST/SGST or IGST split comes from the party’s place of supply, so every invoice line is taxed correctly without a calculator.',
  },
  {
    slug: 'gst-invoice-generator',
    name: 'GST invoice generator',
    tone: 'money-in',
    summary: 'Make a GST tax invoice in the browser and print it or save it as PDF. No signup, no watermark.',
    seoTitle: `Free GST Invoice Generator — No Signup, No Watermark, PDF | ${SITE.name}`,
    seoDescription:
      'Create a GST tax invoice online for free: seller and buyer GSTIN, HSN, CGST/SGST/IGST, round off, amount in words. Print or save as PDF. Nothing is uploaded.',
    headline: 'Free GST invoice generator',
    intro:
      'Fill in your details, your customer’s details, and the items. Tax is split into CGST and SGST or IGST from the place of supply, the total is rounded to the rupee, and the amount is written in words. Print it or save it as a PDF from the print dialog. Everything stays in your browser.',
    sections: [
      {
        heading: 'What a GST tax invoice must show',
        paragraphs: [
          'Rule 46 of the CGST Rules lists the fields: supplier name, address and GSTIN; a consecutive invoice number unique for the financial year (up to 16 characters); invoice date; recipient name, address and GSTIN if registered; HSN or SAC code; description, quantity and unit; taxable value; rate and amount of CGST, SGST/UTGST, IGST and cess; place of supply with state name for inter-state supplies; and a signature of the supplier or an authorised representative.',
          'For an unregistered buyer, include the delivery address and state when the invoice value is ₹50,000 or more.',
        ],
      },
      {
        heading: 'Invoice numbering',
        paragraphs: [
          'Number your invoices in one consecutive series per financial year, for example HK/26-27/0001. Gaps and repeats are a common reason for notices. A billing system that issues numbers from a sequence avoids both.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is this invoice generator really free?',
        answer:
          'Yes. There is no signup, no watermark, and no limit. The invoice is built in your browser and nothing you type is sent to our servers.',
      },
      {
        question: 'Can I save invoices and continue the numbering?',
        answer:
          'This page does not store anything. To keep a history, number invoices automatically, and post them to your books, create a free HisaabKro workspace.',
      },
      {
        question: 'Does this create an e-invoice (IRN)?',
        answer:
          'No. An e-invoice must be reported to the Invoice Registration Portal to get an IRN and QR code. Use the e-invoice checker to see if your business needs it.',
      },
    ],
    productPitch:
      'In HisaabKro, invoice numbers come from a sequence, the buyer comes from your party list, stock moves out automatically, and the sale posts to your ledger and GSTR-1 data.',
  },
  {
    slug: 'hsn-code-finder',
    name: 'HSN & SAC code finder',
    tone: 'inventory',
    summary: 'Find the HSN chapter for any product, or the SAC heading for a service.',
    seoTitle: `HSN Code Finder — Search HSN & SAC Codes by Product Name | ${SITE.name}`,
    seoDescription:
      'Search HSN chapters by product name or code, browse all 98 goods chapters and SAC service headings, and learn how many HSN digits your invoice needs.',
    headline: 'HSN and SAC code finder',
    intro:
      'Search by product name (“mobile phone”, “saree”, “medicine”) or by the first digits of a code. You get the HSN chapter and section, and for services the SAC heading. Open a chapter to see what it covers and how the codes are built.',
    sections: [
      {
        heading: 'How HSN codes are built',
        paragraphs: [
          'HSN (Harmonized System of Nomenclature) codes classify goods. The first two digits are the chapter, four digits the heading, six digits the sub-heading, and India uses eight digits for the full tariff item. For example, chapter 85 is electrical machinery, heading 8517 covers telephone sets including mobile phones.',
          'Services use SAC (Services Accounting Codes), which all start with 99. Heading 9963 covers accommodation and food services, 9983 other professional services, and so on.',
        ],
      },
      {
        heading: 'How many HSN digits your invoice needs',
        paragraphs: [
          'If your aggregate annual turnover in the previous year was above ₹5 crore, show six-digit HSN on every tax invoice. Up to ₹5 crore, show four digits on B2B invoices; on B2C invoices it is optional. (Notification 78/2020 – Central Tax.)',
        ],
      },
      {
        heading: 'Why rates are not shown here',
        paragraphs: [
          'GST rates are set per tariff item by notification and change from time to time, most recently in September 2025. A chapter can contain items at several rates. Confirm the current rate for your exact code on the CBIC GST rate finder before billing.',
        ],
      },
    ],
    faq: [
      {
        question: 'What is the HSN code for mobile phones?',
        answer:
          'Mobile phones fall under chapter 85, heading 8517 (telephone sets, including smartphones). Use the full tariff item from your purchase invoice for your own bills.',
      },
      {
        question: 'What is the difference between HSN and SAC?',
        answer:
          'HSN codes classify goods; SAC codes classify services. Both go on the invoice line, and SAC codes always start with 99.',
      },
      {
        question: 'Where can I check the GST rate for an HSN code?',
        answer:
          'Use the GST rate finder on the CBIC website, or the rate schedules in the latest rate notifications. Your supplier’s invoice for the same item is also a useful cross-check.',
      },
    ],
    productPitch:
      'In HisaabKro the HSN code and GST rate live on the item master, so they print on every invoice and roll up into the HSN summary for GSTR-1 automatically.',
  },
  {
    slug: 'gstin-validator',
    name: 'GSTIN validator',
    tone: 'banking',
    summary: 'Check a GSTIN’s format and check digit, and see the state and PAN inside it.',
    seoTitle: `GSTIN Validator — Check GST Number Format & Checksum | ${SITE.name}`,
    seoDescription:
      'Free GSTIN checker: verify the 15-character format and check digit of any GST number, and decode its state code, PAN, and entity type. Works offline.',
    headline: 'GSTIN validator',
    intro:
      'Paste a GST number to check that it is well-formed and that its last character matches the official check digit. You also see the state it was issued in, the PAN inside it, and the type of entity. The check runs in your browser.',
    sections: [
      {
        heading: 'What the 15 characters mean',
        paragraphs: [
          'Characters 1–2 are the state code (27 is Maharashtra, 07 is Delhi). Characters 3–12 are the holder’s PAN. Character 13 is the registration number for that PAN in that state (1 for the first, 2 for the second, and so on). Character 14 is Z by default. Character 15 is a check digit calculated from the first 14.',
          'The 4th character of the PAN tells you the entity type: P for an individual, C for a company, F for a firm or LLP, H for an HUF, and so on.',
        ],
      },
      {
        heading: 'What this check proves — and what it does not',
        paragraphs: [
          'A valid format and check digit catch typing mistakes, which is the most common GSTIN error on invoices. They do not prove that the registration is active. To confirm the status and legal name, use “Search Taxpayer” on the GST portal.',
        ],
      },
    ],
    faq: [
      {
        question: 'How do I know if a GST number is genuine?',
        answer:
          'First check the format and check digit here. Then search the GSTIN on the GST portal (services.gst.gov.in → Search Taxpayer) to confirm it is active and matches the legal name on the invoice.',
      },
      {
        question: 'Why does a wrong GSTIN matter?',
        answer:
          'If you put a wrong GSTIN on a B2B invoice, the sale is reported against the wrong party in GSTR-1 and your customer cannot claim input tax credit until it is amended.',
      },
    ],
    productPitch:
      'HisaabKro keeps each party’s GSTIN on its record, prints it on every invoice, and uses the place of supply to decide CGST/SGST or IGST.',
  },
  {
    slug: 'gst-due-dates',
    name: 'GST due date calendar',
    tone: 'gst',
    summary: 'Your next GSTR-1, GSTR-3B, PMT-06, CMP-08 and annual return dates.',
    seoTitle: `GST Return Due Dates 2026-27 — GSTR-1, GSTR-3B, QRMP, CMP-08 | ${SITE.name}`,
    seoDescription:
      'See your upcoming GST return due dates for monthly filers, QRMP quarterly filers (22nd/24th by state), and composition dealers. Updated for FY 2026-27.',
    headline: 'GST return due date calendar',
    intro:
      'Choose how you file and your state. You get your next due dates for GSTR-1, GSTR-3B, IFF, PMT-06, CMP-08, GSTR-4, and GSTR-9, in date order.',
    sections: [
      {
        heading: 'Monthly filers',
        paragraphs: [
          'GSTR-1 (outward supplies) is due on the 11th of the next month. GSTR-3B (summary return and tax payment) is due on the 20th of the next month.',
        ],
      },
      {
        heading: 'QRMP scheme (turnover up to ₹5 crore)',
        paragraphs: [
          'Quarterly GSTR-1 is due on the 13th of the month after the quarter. You may upload B2B invoices for the first two months through IFF by the 13th of the next month.',
          'Pay tax for the first two months of a quarter through PMT-06 by the 25th of the next month. Quarterly GSTR-3B is due on the 22nd for taxpayers in Chhattisgarh, Madhya Pradesh, Gujarat, Maharashtra, Karnataka, Goa, Kerala, Tamil Nadu, Telangana, Andhra Pradesh, Daman & Diu and Dadra & Nagar Haveli, Puducherry, Andaman & Nicobar Islands, and Lakshadweep, and on the 24th everywhere else.',
        ],
      },
      {
        heading: 'Composition dealers and annual returns',
        paragraphs: [
          'Composition dealers file CMP-08 by the 18th of the month after each quarter, and GSTR-4 by 30 April after the financial year.',
          'GSTR-9 (annual return) is due by 31 December after the financial year. It is optional when aggregate turnover is up to ₹2 crore.',
        ],
      },
      {
        heading: 'Extensions',
        paragraphs: [
          'These are the dates set by law. The government sometimes extends them by notification, and due dates do not move automatically for weekends or holidays. Check the GST portal for any extension before you rely on a later date.',
        ],
      },
    ],
    faq: [
      {
        question: 'What is the due date for GSTR-3B?',
        answer:
          'For monthly filers, the 20th of the next month. For QRMP filers, the 22nd or 24th of the month after the quarter, depending on your state.',
      },
      {
        question: 'What is the late fee for GSTR-3B?',
        answer:
          'Late fees are charged per day of delay, with lower caps for nil returns and small taxpayers, plus 18% a year interest on tax paid late. Check the current caps on the GST portal.',
      },
    ],
    productPitch:
      'HisaabKro builds your GSTR-1 and GSTR-3B figures from the invoices you already entered, and reconciles GSTR-2B against your purchases before you file.',
  },
  {
    slug: 'e-invoice-e-way-bill-checker',
    name: 'E-invoice & e-way bill checker',
    tone: 'banking',
    summary: 'Find out if e-invoicing applies to your business and if a shipment needs an e-way bill.',
    seoTitle: `E-Invoice Applicability Checker & E-Way Bill Limit 2026 | ${SITE.name}`,
    seoDescription:
      'Check if e-invoicing is mandatory for your turnover (₹5 crore limit, 30-day rule at ₹10 crore) and whether your consignment needs an e-way bill (₹50,000 limit).',
    headline: 'E-invoice and e-way bill checker',
    intro:
      'Answer two quick questions to see whether you must generate e-invoices (IRN) and whether a shipment needs an e-way bill.',
    sections: [
      {
        heading: 'Who must e-invoice',
        paragraphs: [
          'E-invoicing applies to B2B invoices, exports, and credit or debit notes when your aggregate turnover in any financial year from 2017-18 onwards exceeded ₹5 crore. B2C invoices are not e-invoiced.',
          'Since 1 April 2025, businesses with aggregate turnover of ₹10 crore or more must report each invoice to the IRP within 30 days of the invoice date; later uploads are rejected.',
          'Exempt regardless of turnover: SEZ units, insurers, banks, NBFCs and financial institutions, goods transport agencies, passenger transport services, cinema admissions in multiplexes, and government departments and local authorities.',
        ],
      },
      {
        heading: 'When an e-way bill is needed',
        paragraphs: [
          'Generate an e-way bill before moving goods worth more than ₹50,000 in one consignment (value including tax, excluding exempt goods). For movement within a state, some states set a higher limit, so check your state’s notification.',
          'Inter-state movement of goods for job work and of handicraft goods needs an e-way bill even below ₹50,000.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is e-invoicing mandatory below ₹5 crore?',
        answer:
          'No. It applies only when aggregate turnover exceeded ₹5 crore in at least one financial year from 2017-18. Once you cross it, it stays applicable even if turnover falls later.',
      },
      {
        question: 'What is the e-way bill limit?',
        answer:
          '₹50,000 per consignment for inter-state movement. Within a state the limit is ₹50,000 unless your state has notified a higher one.',
      },
    ],
    productPitch:
      'HisaabKro keeps the turnover, invoice, and party details you need for e-invoicing and e-way bills in one place, so you are not re-typing them on the portal.',
  },
  {
    slug: 'payment-reminder',
    name: 'Payment reminder maker',
    tone: 'money-in',
    summary: 'Write a polite or firm udhaar reminder in English or Hindi and send it on WhatsApp.',
    seoTitle: `Payment Reminder Message for WhatsApp — Hindi & English | ${SITE.name}`,
    seoDescription:
      'Write a payment reminder message for customers in English or Hindi, gentle or firm, with your UPI ID — then open it in WhatsApp with one tap. Free, no signup.',
    headline: 'Payment reminder message maker',
    intro:
      'Enter the customer, the amount, and the due date. Pick English or Hindi and a gentle or firm tone. Copy the message or open it straight in WhatsApp, with your UPI ID included so they can pay right away.',
    sections: [
      {
        heading: 'Reminders that get paid',
        paragraphs: [
          'Send the first reminder a day or two before the due date, not after. Mention the exact amount and date, and make paying easy: a UPI ID or payment link in the message removes the “I’ll do it later” step.',
          'Keep the first message friendly. Move to a firmer tone only when the payment is overdue, and keep a record of what you sent.',
        ],
      },
    ],
    faq: [
      {
        question: 'Is my customer’s number sent anywhere?',
        answer:
          'No. The message is built in your browser. When you tap “Open in WhatsApp”, WhatsApp opens with the text filled in and you choose whether to send it.',
      },
      {
        question: 'Can I see all pending payments in one place?',
        answer:
          'Yes — in HisaabKro every party has a ledger and the dashboard shows receivables by age, so you know who to remind first.',
      },
    ],
    productPitch:
      'HisaabKro tracks every customer’s balance (khata) from your invoices and receipts, and shows overdue amounts by age so you know exactly who to remind.',
  },
]

export const TOOLS: Record<ToolSlug, Tool> = Object.fromEntries(
  TOOL_LIST.map((tool) => [tool.slug, tool]),
) as Record<ToolSlug, Tool>

export const TOOLS_HUB = {
  path: '/tools',
  seoTitle: `Free GST Tools for Indian Businesses — Calculator, Invoice, HSN | ${SITE.name}`,
  seoDescription:
    'Free GST tools with no signup: GST calculator, invoice generator, HSN code finder, GSTIN validator, due date calendar, e-invoice checker, and payment reminders.',
  headline: 'Free GST tools',
  intro:
    'Everyday GST jobs, done in your browser. No signup, nothing uploaded.',
} as const

export function toolPath<TSlug extends ToolSlug>(slug: TSlug) {
  return `/tools/${slug}` as const
}
