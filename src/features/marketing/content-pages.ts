import { SITE } from '#/features/marketing/landing-content.ts'
import {
  buildBreadcrumbJsonLd,
  buildFaqPageJsonLd,
  buildMarketingHead,
} from '#/features/marketing/page-head.ts'
import type { ContentSection, FaqItem } from '#/features/marketing/page-head.ts'

export type ContentPage = {
  slug: string
  label: string
  seoTitle: string
  seoDescription: string
  headline: string
  intro: string
  sections: ReadonlyArray<ContentSection>
  faq: ReadonlyArray<FaqItem>
  /** Free tools that help with this topic, linked under the article. */
  relatedTools: ReadonlyArray<string>
}

export type ContentCollection = {
  basePath: '/guides' | '/gst-billing-software-for' | '/compare'
  /** Router path for one page in this collection, used by `Link` with `params`. */
  pageRoute: '/guides/$slug' | '/gst-billing-software-for/$slug' | '/compare/$slug'
  hubLabel: string
  pages: ReadonlyArray<ContentPage>
}

export const GUIDES: ContentCollection = {
  basePath: '/guides',
  pageRoute: '/guides/$slug',
  hubLabel: 'GST guides',
  pages: [
    {
      slug: 'gst-rate-slabs-2025',
      label: 'GST rate slabs after September 2025',
      seoTitle: `New GST Rates 2025: 5%, 18% and 40% Slabs Explained | ${SITE.name}`,
      seoDescription:
        'What changed in the GST rate rationalisation of 22 September 2025: the 5% and 18% slabs, the 40% rate, what happened to 12% and 28%, and what to update in your billing.',
      headline: 'GST rate slabs after September 2025, explained',
      intro:
        'From 22 September 2025, GST moved to two main slabs — 5% and 18% — with a 40% rate for a short list of goods. Here is what changed and what to update in your item masters.',
      sections: [
        {
          heading: 'The new structure',
          paragraphs: [
            '5% is the merit rate for essentials and many everyday goods. 18% is the standard rate for most goods and services. 40% is a special rate for luxury and sin goods.',
            'Most goods that were at 12% moved to 5%, and most goods that were at 28% moved to 18%. Nil-rated and exempt supplies stay outside the slabs, and special rates continue for some categories, such as 3% on gold and jewellery and 0.25% on rough diamonds.',
          ],
        },
        {
          heading: 'What to update in your billing',
          paragraphs: [
            'Check the GST rate on every item in your item master against the notification for its HSN code. Do not assume a blanket 12 → 5 or 28 → 18 change: some items moved differently.',
            'Invoices dated on or after 22 September 2025 use the new rate. For supplies that straddle the change, the time of supply rules decide which rate applies.',
            'Update price lists and MRP-based selling prices where the tax change should pass to the customer.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is there still a 12% GST slab?',
          answer:
            'For most goods and services, no — they moved to 5% or 18%. Check your item’s HSN code in the rate notification, since a few categories have their own rates.',
        },
        {
          question: 'When did the new GST rates start?',
          answer: '22 September 2025.',
        },
      ],
      relatedTools: ['gst-calculator', 'hsn-code-finder'],
    },
    {
      slug: 'gst-invoice-format',
      label: 'GST invoice format and mandatory fields',
      seoTitle: `GST Invoice Format: Mandatory Fields Under Rule 46 (2026) | ${SITE.name}`,
      seoDescription:
        'Every field a GST tax invoice must show under Rule 46, the difference between a tax invoice and a bill of supply, numbering rules, and B2C limits.',
      headline: 'GST invoice format: every field your bill must show',
      intro:
        'A tax invoice is the document your customer uses to claim input tax credit, so a missing field can cost them money and you a customer. This is the checklist from Rule 46 of the CGST Rules.',
      sections: [
        {
          heading: 'Mandatory fields on a tax invoice',
          paragraphs: [
            'Supplier name, address, and GSTIN. A consecutive serial number of up to 16 characters, unique for the financial year (letters, numbers, “-” and “/” allowed). Date of issue.',
            'Recipient name, address, and GSTIN if registered. For an unregistered recipient with an invoice value of ₹50,000 or more, the delivery address and state.',
            'HSN code for goods or SAC code for services, description, quantity and unit, total value, taxable value after discounts, rate and amount of CGST, SGST/UTGST, IGST and cess, place of supply with state name for inter-state supplies, whether tax is payable on reverse charge, and the signature or digital signature of the supplier or an authorised representative.',
          ],
        },
        {
          heading: 'Tax invoice or bill of supply?',
          paragraphs: [
            'Issue a bill of supply instead of a tax invoice when you sell exempt goods or services, or when you are registered under the composition scheme. A bill of supply does not show tax, and a composition dealer must mention “composition taxable person, not eligible to collect tax on supplies”.',
          ],
        },
        {
          heading: 'Numbering and copies',
          paragraphs: [
            'Keep one consecutive series per financial year (you may run separate series, for example per branch, as long as each is consecutive). For goods, issue the invoice in triplicate: original for the recipient, duplicate for the transporter, triplicate for the supplier. For services, issue it in duplicate.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can a GST invoice be handwritten?',
          answer:
            'Yes, if it has every mandatory field. But businesses above the e-invoicing threshold must report B2B invoices to the IRP, which needs digital data.',
        },
        {
          question: 'Is HSN mandatory on B2C invoices?',
          answer:
            'Up to ₹5 crore turnover, HSN is optional on B2C invoices. Above ₹5 crore, six-digit HSN is required on all tax invoices.',
        },
      ],
      relatedTools: ['gst-invoice-generator', 'hsn-code-finder', 'gstin-validator'],
    },
    {
      slug: 'cgst-sgst-igst',
      label: 'CGST vs SGST vs IGST',
      seoTitle: `CGST vs SGST vs IGST: Differences, Place of Supply & ITC Order | ${SITE.name}`,
      seoDescription:
        'When to charge CGST + SGST and when to charge IGST, how place of supply decides it, and the order in which input tax credit is used against each tax.',
      headline: 'CGST, SGST, and IGST: which one to charge',
      intro:
        'Every GST rate is charged either as CGST + SGST (or UTGST) or as IGST. Which one depends on where the supply is made, not on where the buyer is registered.',
      sections: [
        {
          heading: 'The rule',
          paragraphs: [
            'Intra-state supply — supplier location and place of supply in the same state: charge CGST and SGST, each at half the rate. In a union territory without a legislature, SGST is replaced by UTGST.',
            'Inter-state supply — place of supply in a different state, and all imports and exports: charge IGST at the full rate.',
          ],
        },
        {
          heading: 'Place of supply in practice',
          paragraphs: [
            'For goods, the place of supply is usually where the movement of goods ends for delivery. For goods sold over the counter, it is the shop. For most services to a registered business, it is the recipient’s location.',
            'Charging the wrong tax is not fixed by a simple adjustment: you pay the right tax and claim a refund of the wrong one, so getting place of supply right at billing time matters.',
          ],
        },
        {
          heading: 'How input tax credit is used',
          paragraphs: [
            'IGST credit is used first against IGST liability, then against CGST and SGST. CGST credit is used against CGST, then IGST. SGST credit is used against SGST, then IGST. CGST credit can never pay SGST and vice versa.',
          ],
        },
      ],
      faq: [
        {
          question: 'Why is 18% shown as 9% + 9%?',
          answer:
            'Because it is an intra-state supply: 9% goes to the Centre as CGST and 9% to the state as SGST. For an inter-state sale it would be 18% IGST.',
        },
        {
          question: 'Do I charge IGST to an unregistered buyer in another state?',
          answer:
            'Yes, if the place of supply is in another state. Inter-state B2C invoices above ₹1 lakh are also reported invoice-wise (B2CL) in GSTR-1.',
        },
      ],
      relatedTools: ['gst-calculator', 'gst-invoice-generator'],
    },
    {
      slug: 'composition-scheme',
      label: 'GST composition scheme',
      seoTitle: `GST Composition Scheme 2026: Limits, Rates, Bill of Supply | ${SITE.name}`,
      seoDescription:
        'Who can opt for the GST composition scheme, the turnover limits and tax rates, what a bill of supply must say, and the CMP-08 and GSTR-4 returns.',
      headline: 'GST composition scheme: limits, rates, and returns',
      intro:
        'The composition scheme lets small businesses pay GST at a flat percentage of turnover with simpler returns — in exchange for giving up input tax credit and charging no tax on bills.',
      sections: [
        {
          heading: 'Who can opt in',
          paragraphs: [
            'Manufacturers and traders with aggregate turnover up to ₹1.5 crore in the previous year (₹75 lakh in special category states), and restaurants that do not serve alcohol. Service providers can use a separate composition option up to ₹50 lakh.',
            'You cannot opt in if you make inter-state outward supplies, sell through e-commerce operators that collect tax at source (with limited exceptions), or manufacture notified goods such as ice cream, pan masala, and tobacco.',
          ],
        },
        {
          heading: 'Rates',
          paragraphs: [
            '1% of turnover for manufacturers and traders, 5% for restaurants, and 6% for service providers under the separate option (each split equally between CGST and SGST).',
          ],
        },
        {
          heading: 'Billing and returns',
          paragraphs: [
            'Issue a bill of supply, not a tax invoice, and write “composition taxable person, not eligible to collect tax on supplies” on it. Display the same words on a board at your place of business.',
            'Pay tax quarterly with CMP-08 by the 18th of the month after each quarter, and file the annual return GSTR-4 by 30 April after the financial year.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can a composition dealer claim input tax credit?',
          answer: 'No. That is the main trade-off for the lower flat rate and simpler returns.',
        },
        {
          question: 'Can a composition dealer sell to other states?',
          answer:
            'Not goods or services as outward supplies — a composition dealer cannot make inter-state outward supplies. Buying from other states is allowed.',
        },
      ],
      relatedTools: ['gst-due-dates', 'gst-invoice-generator'],
    },
  ],
}

export const USE_CASES: ContentCollection = {
  basePath: '/gst-billing-software-for',
  pageRoute: '/gst-billing-software-for/$slug',
  hubLabel: 'GST billing by business',
  pages: [
    {
      slug: 'kirana-store',
      label: 'Kirana and general stores',
      seoTitle: `GST Billing Software for Kirana Stores — Free | ${SITE.name}`,
      seoDescription:
        'Free GST billing software for kirana and general stores: fast counter billing from the keyboard, mixed GST rates on one bill, stock, and customer khata.',
      headline: 'GST billing software for kirana and general stores',
      intro:
        'A kirana bill mixes exempt items, 5% items, and 18% items, and the customer is waiting at the counter. HisaabKro is built for keyboard-first billing, so a full bill takes seconds.',
      sections: [
        {
          heading: 'What a kirana store needs from billing',
          paragraphs: [
            'Every item carries its own HSN and GST rate on the item master, so a bill with atta, biscuits, and detergent is taxed line by line without you thinking about it.',
            'Customers who buy on credit get a ledger (khata) that updates from every bill and receipt, and receivable ageing shows who has been pending longest.',
          ],
        },
        {
          heading: 'Composition or regular?',
          paragraphs: [
            'Many small kirana stores choose the composition scheme (1% of turnover, up to ₹1.5 crore in most states). You then issue a bill of supply without tax. If you buy mostly from registered suppliers, the regular scheme may work out better because you can claim input tax credit.',
          ],
        },
      ],
      faq: [
        {
          question: 'Is HisaabKro free for a small shop?',
          answer: 'Yes. Billing, purchases, stock, and party ledgers have no license fee.',
        },
        {
          question: 'Does it work with a barcode scanner?',
          answer: 'Not yet — barcode lookup is not built. Items are picked by name or code from the keyboard.',
        },
      ],
      relatedTools: ['gst-calculator', 'payment-reminder'],
    },
    {
      slug: 'pharmacy',
      label: 'Pharmacies and medical stores',
      seoTitle: `GST Billing Software for Medical Stores & Pharmacies | ${SITE.name}`,
      seoDescription:
        'GST billing for medical stores: HSN-wise rates on every medicine, purchase bills from distributors, stock by godown, and GSTR-2B reconciliation. Free.',
      headline: 'GST billing software for pharmacies and medical stores',
      intro:
        'After the September 2025 rate changes, most medicines are at 5% and some life-saving drugs are exempt — so the rate has to come from each item, not from a default.',
      sections: [
        {
          heading: 'What HisaabKro covers for a pharmacy',
          paragraphs: [
            'Medicine-wise HSN codes and GST rates on the item master, purchase bills from distributors with goods receipt, stock by godown, and GSTR-2B reconciliation so you only claim credit your suppliers actually filed.',
          ],
        },
        {
          heading: 'What it does not do yet',
          paragraphs: [
            'Batch numbers and expiry dates are not tracked today, and there is no prescription register. If those are essential for your store, tell us — they are on the list of requests we track.',
          ],
        },
      ],
      faq: [
        {
          question: 'What is the GST rate on medicines?',
          answer:
            'Most medicines are 5% after September 2025, and some specified life-saving drugs are exempt. Check the rate for each HSN code in the rate notification.',
        },
      ],
      relatedTools: ['hsn-code-finder', 'gst-calculator'],
    },
    {
      slug: 'hardware-store',
      label: 'Hardware and building material',
      seoTitle: `GST Billing Software for Hardware & Building Material Shops | ${SITE.name}`,
      seoDescription:
        'GST billing for hardware, sanitaryware, and building material dealers: B2B invoices with GSTIN, e-way bill details, godown stock, and party ageing. Free.',
      headline: 'GST billing software for hardware and building material dealers',
      intro:
        'Hardware and building material dealers sell to contractors on credit, move heavy consignments, and carry many SKUs across godowns. Billing has to handle all three.',
      sections: [
        {
          heading: 'B2B billing and credit',
          paragraphs: [
            'Contractors need proper tax invoices with their GSTIN to claim input tax credit. Party ledgers and receivable ageing show which contractor owes what and for how long.',
          ],
        },
        {
          heading: 'Stock and movement',
          paragraphs: [
            'Track stock by godown, with every change flowing through stock movements so the numbers reconcile. Consignments above ₹50,000 need an e-way bill — use the checker to confirm.',
            'Cement moved from 28% to 18% in the September 2025 rate changes; check each item’s current rate in your masters.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can I keep stock in more than one godown?',
          answer: 'Yes. Stock is tracked per godown, and every change goes through a stock movement.',
        },
      ],
      relatedTools: ['e-invoice-e-way-bill-checker', 'gstin-validator'],
    },
    {
      slug: 'textile-garment',
      label: 'Textile and garment businesses',
      seoTitle: `GST Billing Software for Textile & Garment Shops | ${SITE.name}`,
      seoDescription:
        'GST billing for textile and readymade garment businesses: price-based GST rates on apparel, fabric at 5%, HSN chapters 50–63, and job work. Free.',
      headline: 'GST billing software for textile and garment businesses',
      intro:
        'Apparel GST depends on the sale value of each piece, so the same shirt can be taxed at different rates depending on its price. Your billing must get that right on every line.',
      sections: [
        {
          heading: 'Rates that depend on price',
          paragraphs: [
            'After the September 2025 changes, readymade garments and made-ups priced up to ₹2,500 per piece are taxed at 5%, and above ₹2,500 at 18%. Most fabrics are 5%. Confirm the rate for your HSN code in the notification.',
            'Garments fall under HSN chapters 61 (knitted) and 62 (not knitted); fabrics and yarns under chapters 50 to 60.',
          ],
        },
        {
          heading: 'Job work',
          paragraphs: [
            'Sending fabric for stitching or dyeing is job work. Inter-state movement of goods for job work needs an e-way bill whatever the value.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can HisaabKro pick the rate automatically based on price?',
          answer:
            'Not yet. Set the rate on each item; if you sell the same design at prices on both sides of ₹2,500, keep them as separate items.',
        },
      ],
      relatedTools: ['hsn-code-finder', 'gst-calculator'],
    },
    {
      slug: 'restaurant',
      label: 'Restaurants and cafés',
      seoTitle: `GST Billing for Restaurants & Cafés — 5% GST Rules Explained | ${SITE.name}`,
      seoDescription:
        'How GST works for restaurants: 5% without input tax credit for most restaurants, when 18% applies, composition at 5%, and what to put on the bill.',
      headline: 'GST for restaurants and cafés',
      intro:
        'Most restaurants charge 5% GST and cannot claim input tax credit. A few, mainly those inside hotels with high room tariffs, charge 18% with credit. Here is how to tell which you are.',
      sections: [
        {
          heading: 'Which rate applies',
          paragraphs: [
            'Standalone restaurants, cafés, and takeaways charge 5% without input tax credit. Restaurants in hotels where any room’s declared tariff is above ₹7,500 a night charge 18% with input tax credit. Outdoor catering follows its own rules.',
            'Small restaurants can choose the composition scheme at 5% of turnover; they then issue a bill of supply and cannot charge GST to customers.',
          ],
        },
        {
          heading: 'Where HisaabKro fits',
          paragraphs: [
            'HisaabKro is a billing and accounting workspace, not a restaurant POS: there are no table or KOT screens. It suits restaurants that want proper books, purchases, and GST reports alongside their POS.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can a restaurant claim ITC at 5%?',
          answer: 'No. The 5% rate for restaurants comes without input tax credit.',
        },
      ],
      relatedTools: ['gst-calculator', 'gst-due-dates'],
    },
    {
      slug: 'distributor',
      label: 'Distributors and wholesalers',
      seoTitle: `GST Billing Software for Distributors & Wholesalers — Free | ${SITE.name}`,
      seoDescription:
        'GST billing and accounting for distributors and wholesalers: B2B invoices, purchase orders and GRN, godowns, party ageing, and GSTR-2B reconciliation. Free.',
      headline: 'GST billing software for distributors and wholesalers',
      intro:
        'Distribution runs on volume and credit: many B2B invoices a day, stock across godowns, and dozens of retailers with balances. HisaabKro keeps all of it on one double-entry ledger.',
      sections: [
        {
          heading: 'From purchase to collection',
          paragraphs: [
            'Raise purchase orders, receive goods against them with a GRN, and book the purchase bill — stock and payables stay in sync. Sell on tax invoices that carry each retailer’s GSTIN, and track receivables by age.',
            'Reconcile GSTR-2B against your purchase books before filing, so you only claim credit your suppliers have reported.',
          ],
        },
        {
          heading: 'Compliance at volume',
          paragraphs: [
            'Above ₹5 crore turnover, B2B invoices must be e-invoiced; above ₹10 crore, within 30 days. Most consignments above ₹50,000 need an e-way bill. Use the checker to confirm what applies.',
          ],
        },
      ],
      faq: [
        {
          question: 'Can my accountant and staff use the same account?',
          answer: 'Yes. Invite teammates with roles, and they work in the same company without sharing a login.',
        },
      ],
      relatedTools: ['e-invoice-e-way-bill-checker', 'payment-reminder'],
    },
  ],
}

export const COMPARISONS: ContentCollection = {
  basePath: '/compare',
  pageRoute: '/compare/$slug',
  hubLabel: 'Compare',
  pages: [
    {
      slug: 'tally-vs-busy',
      label: 'Tally vs BUSY',
      seoTitle: `Tally vs BUSY: Which Accounting Software in 2026? | ${SITE.name}`,
      seoDescription:
        'Tally vs BUSY compared on what stays true: delivery, licensing, multi-company, and who each suits — plus a free browser-based option if you want neither license.',
      headline: 'Tally vs BUSY: how to choose',
      intro:
        'Tally and BUSY are the two best-known desktop accounting packages for Indian businesses. Both are installed on a Windows PC and sold as a paid license, so the choice usually comes down to your accountant and your workflow.',
      sections: [
        {
          heading: 'What they have in common',
          paragraphs: [
            'Both run as desktop software on your own computer, both are sold as paid licenses, both handle GST invoicing, inventory, and multi-company accounts, and neither publishes its source code.',
          ],
        },
        {
          heading: 'How to decide between them',
          paragraphs: [
            'Ask your CA which one they use — data exchange and support are easier when you match. Try both with a day of your own real entries, paying attention to how fast a sales invoice takes from the keyboard. Check the cost of the edition and number of users you actually need, and the yearly renewal.',
          ],
        },
        {
          heading: 'If you want neither license',
          paragraphs: [
            `${SITE.name} runs in the browser, has no license fee, and keeps sales, purchases, stock, and GST reports on a double-entry ledger. It is open source, so you can also self-host it.`,
          ],
        },
      ],
      faq: [
        {
          question: 'Is Tally or BUSY better for GST?',
          answer:
            'Both cover GST invoicing and returns. The better choice is the one your accountant supports and your staff can bill fastest in.',
        },
        {
          question: 'Do Tally and BUSY work online?',
          answer:
            'Both are primarily desktop installs. Remote access usually needs an add-on or a remote desktop setup. A browser-based tool such as HisaabKro works from any device by design.',
        },
      ],
      relatedTools: ['gst-invoice-generator'],
    },
  ],
}

export function findContentPage(collection: ContentCollection, slug: string) {
  return collection.pages.find((page) => page.slug === slug)
}

export const CONTENT_HUBS = {
  guides: {
    collection: GUIDES,
    title: `GST Guides for Indian Businesses — Rates, Invoices, Returns | ${SITE.name}`,
    description:
      'Plain-English GST guides: the 2025 rate slabs, invoice format, CGST vs SGST vs IGST, and the composition scheme.',
    headline: 'GST guides',
    intro: 'Short, practical answers to the GST questions that come up at the billing counter.',
  },
  useCases: {
    collection: USE_CASES,
    title: `GST Billing Software by Business Type | ${SITE.name}`,
    description:
      'GST billing for kirana stores, pharmacies, hardware dealers, textile shops, restaurants, and distributors — the rules that matter for each trade.',
    headline: 'GST billing for your kind of business',
    intro: 'The GST rules and billing habits that matter for each trade, and where HisaabKro fits.',
  },
  comparisons: {
    collection: COMPARISONS,
    title: `Accounting Software Comparisons for India | ${SITE.name}`,
    description: 'Side-by-side comparisons of the accounting software Indian businesses choose between.',
    headline: 'Compare accounting software',
    intro: 'Stable facts about the tools Indian businesses choose between, and how to decide.',
  },
} as const

export function buildContentHubHead(hub: (typeof CONTENT_HUBS)[keyof typeof CONTENT_HUBS]) {
  return buildMarketingHead({
    path: hub.collection.basePath,
    title: hub.title,
    description: hub.description,
    jsonLd: [buildBreadcrumbJsonLd([{ name: hub.collection.hubLabel, path: hub.collection.basePath }])],
  })
}

export function buildContentPageHead(collection: ContentCollection, page: ContentPage) {
  const path = `${collection.basePath}/${page.slug}`
  return buildMarketingHead({
    path,
    title: page.seoTitle,
    description: page.seoDescription,
    jsonLd: [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: page.headline,
        description: page.seoDescription,
        url: `${SITE.url}${path}`,
        publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
      },
      buildFaqPageJsonLd(page.faq),
      buildBreadcrumbJsonLd([
        { name: collection.hubLabel, path: collection.basePath },
        { name: page.label, path },
      ]),
    ],
  })
}
