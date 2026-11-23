import { SITE } from '#/features/marketing/landing-content.ts'
import {
  buildBreadcrumbJsonLd,
  buildMarketingHead,
} from '#/features/marketing/page-head.ts'

/**
 * Task-based "how to" guides. One source feeds the in-app Guides sheet (Help
 * menu) and the public `/help` pages.
 *
 * Steps use the app's exact button and menu labels. Wrap a label in `**` so
 * both views can show it in bold; `Group → Page` names a sidebar entry.
 */
export type HelpGuide = {
  slug: string
  title: string
  summary: string
  seoTitle: string
  seoDescription: string
  steps: ReadonlyArray<string>
  /** The app page the guide starts on, offered as a link in the Guides sheet. */
  appPath: string
}

export const HELP_HUB = {
  path: '/help',
  label: 'Help',
  title: `How to Use ${SITE.name}: Step-by-Step Guides | ${SITE.name}`,
  description: `Short step-by-step guides for ${SITE.name}: set up your company, create GST invoices, record purchases and payments, returns, GSTR-1 and GSTR-3B, Tally export, and your team.`,
  headline: `How to use ${SITE.name}`,
  intro: 'Short, step-by-step guides for the everyday jobs in your books.',
} as const

export const HELP_GUIDES: ReadonlyArray<HelpGuide> = [
  {
    slug: 'set-up-your-company',
    title: 'Set up your company',
    summary: 'Create your account and company, then add the details that print on invoices.',
    seoTitle: `How to Set Up Your Company for GST Billing | ${SITE.name}`,
    seoDescription: `Create a ${SITE.name} account, add your company with GSTIN, state and financial year, and fill in the profile that prints on your GST invoices.`,
    steps: [
      'Choose **Start free** on hisaabkro.in, then **Create account** (or **Sign up with Google**).',
      'On **Set up your company**, enter your **Legal name** and **Trade name**, then choose **Continue**.',
      'Under **Tax & books**, enter your **GSTIN (optional)**. The **State** fills in from the GSTIN; pick it yourself if you are not registered.',
      'Enter your **Business address**, **City** and **PIN code**, check the **Financial year start**, then choose **Continue**.',
      'Pick your **Business type** and choose **Create company**. Your ledgers and financial year are set up for you.',
      'Open **Masters → Company profile**, add your **PAN**, bank details, **UPI ID** and **Invoice terms**, then choose **Save profile**. These print on your invoices.',
    ],
    appPath: '/app/masters/company-profile',
  },
  {
    slug: 'add-customer-supplier-and-item',
    title: 'Add a customer, supplier or item',
    summary: 'Add the parties you bill and buy from, and the items you sell.',
    seoTitle: `How to Add Customers, Suppliers and Items | ${SITE.name}`,
    seoDescription: `Add customers and suppliers with GSTIN, state and opening balance, and items with HSN, GST rate, units and opening stock in ${SITE.name}.`,
    steps: [
      'Open **Parties → Customers & suppliers** and choose **New party**.',
      'Enter the **Name**, set **Type** to **Customer**, **Supplier** or **Both**, and pick the **State / POS**.',
      'Add the **GSTIN** for a registered party, and the address, **Phone** and **Payment terms** if you use them.',
      'If you already had dues with this party, enter the **Opening balance** and pick **To receive (Dr)** or **To pay (Cr)**. Choose **Save**.',
      'Open **Inventory → Items** and choose **New item**.',
      'Enter the **Item name**, **HSN / SAC**, **GST tax slab**, **Main unit**, **Purchase rate** and **Sale rate**.',
      'For goods you stock, keep **Track inventory** on **Yes — stock item** and enter the **Opening stock qty**. Choose **Save item**.',
      'While billing, you can also pick **Add new customer…**, **Add new supplier…** or **Add new item…** straight from the list.',
    ],
    appPath: '/app/masters/parties',
  },
  {
    slug: 'create-a-sales-invoice',
    title: 'Create a sales invoice',
    summary: 'Bill a customer with the right GST, then print or share the invoice.',
    seoTitle: `How to Create a GST Sales Invoice | ${SITE.name}`,
    seoDescription: `Create a GST tax invoice in ${SITE.name}: pick the customer and items, check CGST/SGST or IGST, save, then print, download as PDF, or share on WhatsApp.`,
    steps: [
      'Choose **New bill → New sales invoice** at the top of any page, or press **Alt+S**.',
      'Under **Customer**, pick the customer, or choose **Add new customer…**.',
      'Check the **Date**, and set **Payment** to **Credit** or **Cash**. For credit, set the **Due date**.',
      'Under **Line items**, pick an **Item** and enter the **Qty**, **Rate** and any **Disc%**. Choose **Add row** for more, or scan into **Scan barcode**.',
      'Open **Tax & billing** if you need to change the **Series**, **Place of supply** or **Tax type** (**Exclusive** or **Inclusive** of GST).',
      'Check the **GST summary** and **Grand total**, then choose **Save bill**. The invoice number comes from your series.',
      'In the preview, choose **Print**, **Download PDF**, **WhatsApp** or **Email**.',
    ],
    appPath: '/app/sales/new',
  },
  {
    slug: 'record-a-purchase-bill',
    title: 'Record a purchase bill',
    summary: 'Enter a supplier’s bill so stock, payables and input GST are updated.',
    seoTitle: `How to Record a Purchase Bill with GST | ${SITE.name}`,
    seoDescription: `Record a supplier's purchase bill in ${SITE.name}: supplier bill number, items, GST and reverse charge, so stock, payables and input tax credit stay correct.`,
    steps: [
      'Choose **New bill → New purchase bill**, or press **Alt+P**.',
      'Under **Supplier**, pick the supplier, or choose **Add new supplier…**.',
      'Enter the **Supplier bill no.** and the **Date** printed on the supplier’s bill.',
      'Under **Line items**, pick each **Item** and enter the **Qty**, **Rate** and any **Disc%** from the bill.',
      'Open **Bill options** to set the **Place of supply**, the **Tax type** (**Exclusive**, **Inclusive** or **Reverse charge**), the **Due date**, or a **Bill attachment**.',
      'Check that the **Grand total** matches the supplier’s bill, then choose **Save bill**.',
    ],
    appPath: '/app/purchases/new',
  },
  {
    slug: 'record-a-payment-or-receipt',
    title: 'Record a payment or receipt',
    summary: 'Record money received from customers or paid to suppliers, against their bills.',
    seoTitle: `How to Record Payments and Receipts Against Invoices | ${SITE.name}`,
    seoDescription: `Record a customer receipt or supplier payment in ${SITE.name} by cash, UPI, bank transfer or cheque, and adjust it against open invoices and bills.`,
    steps: [
      'Open **Payments & banking → Receipts & payments**, or press **Alt+R** for a receipt or **Alt+Y** for a payment.',
      'Pick the **Receipts** or **Payments** tab and choose **New receipt** or **New payment**.',
      'Pick the **Customer** or **Supplier**, and enter the **Date** and **Amount**.',
      'Set the **Mode** to **Cash**, **UPI**, **Bank transfer** or **Cheque**.',
      'Under **Open invoices** or **Open bills**, enter what to **Adjust** against each one, or choose **Adjust oldest first**. Anything left over is kept as an **Advance**.',
      'Add a **Narration** if you like, then choose **Save receipt** or **Save payment**.',
    ],
    appPath: '/app/payments',
  },
  {
    slug: 'sales-and-purchase-returns',
    title: 'Record a sales or purchase return',
    summary: 'Issue a credit note for goods a customer returns, or a debit note for goods you send back.',
    seoTitle: `How to Record Sales Returns (Credit Notes) and Purchase Returns | ${SITE.name}`,
    seoDescription: `Record a sales return as a credit note or a purchase return as a debit note in ${SITE.name}, with stock and GST reversed automatically.`,
    steps: [
      'Open **Sales → Returns**.',
      'Pick **Sales return** for goods a customer sends back (a credit note), or **Purchase return** for goods you send back to a supplier (a debit note).',
      'Under **Sales invoice** or **Purchase bill**, pick the original document.',
      'Enter the **Return qty (first line)** and the **Return date**. The return is for the first item line of that invoice or bill.',
      'Choose **Post return**. Stock, the party’s balance and GST are reversed at the rate the original document charged.',
    ],
    appPath: '/app/returns',
  },
  {
    slug: 'gstr-1-and-gstr-3b',
    title: 'Get your GSTR-1 and GSTR-3B figures',
    summary: 'See the GSTR-1 and GSTR-3B summaries for a month and download the GSTR-1 JSON.',
    seoTitle: `How to Prepare GSTR-1 and GSTR-3B Data from Your Books | ${SITE.name}`,
    seoDescription: `Prepare GSTR-1 and GSTR-3B from your invoices and bills in ${SITE.name}: pick the return period, review the summary, download the GSTR-1 JSON, and match it with the portal.`,
    steps: [
      'Open **GST & reports → Reports**.',
      'Pick the **GSTR-1** tab and set the **Period start** and **Period end** to the month you are filing.',
      'Review the **GSTR-1 summary**, then choose **Download JSON** to upload it on the GST portal.',
      'After filing, upload the portal’s file under **Match with filed GSTR-1** and choose **Compare with books** to spot anything **Mismatched** or missing.',
      'Pick the **GSTR-3B** tab for the same period. It shows your outward supplies and **4 Eligible ITC**, net of credit and debit notes.',
      'Use the **GSTR-2B** tab to check your purchase bills against the portal and **Accept** or **Reject** each ITC line before you file.',
    ],
    appPath: '/app/reports',
  },
  {
    slug: 'export-to-tally-and-back-up',
    title: 'Export to Tally or back up your data',
    summary: 'Hand your books to an accountant in Tally, or keep your own copy.',
    seoTitle: `How to Export Your Books to Tally (XML) and Back Up | ${SITE.name}`,
    seoDescription: `Export ledgers, parties, stock items and vouchers from ${SITE.name} as Tally XML, download an accountant export, or keep a full company backup.`,
    steps: [
      'Open **GST & reports → Reports** and pick the **Export** tab.',
      'Under **Tally export**, set the **Period start** and **Period end**, then choose **Download for Tally (XML)**. Import the file in Tally.',
      'For an accountant who doesn’t use Tally, choose **Download for your accountant** under **Accountant export**.',
      'To keep your own copy, open **Settings** and choose **Download company backup** under **Backup export**.',
    ],
    appPath: '/app/reports',
  },
  {
    slug: 'invite-a-team-member',
    title: 'Invite a team member',
    summary: 'Give your accountant or staff their own login with the right role.',
    seoTitle: `How to Invite Your Accountant or Staff with Role-Based Access | ${SITE.name}`,
    seoDescription: `Invite your accountant, billing staff or store team to ${SITE.name} with their own login, and choose a role that controls what they can see and post.`,
    steps: [
      'Open **Settings** and find **Team members**.',
      'Choose **Invite**.',
      'Enter their **Email** and pick a **Role**: **Admin**, **Accountant**, **Billing**, **Inventory** or **Read only**.',
      'Choose **Send invite**. They get an email link to join this company.',
      'Until they join, the invite stays under **Pending invitations**, where you can resend or revoke it. You can change a member’s **Role** at any time.',
    ],
    appPath: '/app/settings',
  },
]

export function findHelpGuide(slug: string) {
  return HELP_GUIDES.find((guide) => guide.slug === slug)
}

export function helpGuidePath(guide: HelpGuide) {
  return `${HELP_HUB.path}/${guide.slug}`
}

export type StepSegment = { text: string; label: boolean }

/** Splits a step into plain text and `**label**` parts, in order. */
export function parseStep(step: string): Array<StepSegment> {
  return step
    .split('**')
    .map((text, index) => ({ text, label: index % 2 === 1 }))
    .filter((segment) => segment.text.length > 0)
}

/** Plain text for meta tags and JSON-LD. */
export function stepPlainText(step: string) {
  return step.replaceAll('**', '')
}

export function buildHelpHubHead() {
  return buildMarketingHead({
    path: HELP_HUB.path,
    title: HELP_HUB.title,
    description: HELP_HUB.description,
    jsonLd: [buildBreadcrumbJsonLd([{ name: HELP_HUB.label, path: HELP_HUB.path }])],
  })
}

export function buildHelpGuideHead(guide: HelpGuide) {
  const path = helpGuidePath(guide)
  return buildMarketingHead({
    path,
    title: guide.seoTitle,
    description: guide.seoDescription,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: guide.title,
        description: guide.seoDescription,
        url: `${SITE.url}${path}`,
        step: guide.steps.map((step, index) => ({
          '@type': 'HowToStep',
          position: index + 1,
          text: stepPlainText(step),
        })),
      },
      buildBreadcrumbJsonLd([
        { name: HELP_HUB.label, path: HELP_HUB.path },
        { name: guide.title, path },
      ]),
    ],
  })
}
