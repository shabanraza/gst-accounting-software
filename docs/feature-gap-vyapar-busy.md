# Feature gap: HisaabKro vs Vyapar and BUSY 21

_Researched 21 Nov 2026. HisaabKro statuses come from the repo at commit
882260c. Vendor feature lists come from vendor pages, which are often
undated. Legal points cite primary sources where they could be reached, and
the rest are flagged._

## 1. Summary: top 5 gaps

1. **Live e-invoice (IRN/QR) through an IRP/GSP.** This is legally required
   for B2B invoices once AATO passes ₹5 cr. The only code is
   `src/features/gst/e-invoice-service.ts`, which makes a fake hash "IRN". No
   router or UI is wired to it. BUSY Standard and Vyapar both have it. This is
   the biggest blocker for selling to ₹5 cr+ wholesalers, who are BUSY's core
   market.
2. **Batch / expiry (and serial) inventory.** Pharma, FMCG distribution and
   electronics all expect it. Vyapar and BUSY Standard both have it.
   HisaabKro has no batch, expiry or serial columns.
3. **TDS on bills and payments.** Buyers with turnover above ₹10 cr must
   deduct TDS on goods purchases (s.194Q, now in s.393 of the Income-tax Act
   2025). Contractor and professional payments carry TDS at any company size.
   HisaabKro has no TDS code.
4. **Composition scheme mode and reverse charge (RCM) posting.** Composition
   dealers are a large share of small shops and need bill of supply, CMP-08
   and GSTR-4. In HisaabKro, RCM is only a stored `reverse_charge` flag that
   prints "Reverse Charge: Yes/No"; no liability or ITC is posted. Vyapar
   produces GSTR-4.
5. **Offline / fast counter billing (POS + thermal print).** This is
   Vyapar's main selling point and is in BUSY Standard. HisaabKro is
   online-only. There is no service worker and no offline store in `mobile/`,
   no POS screen, and no 58/80 mm print layout.

Runners-up: BOM / manufacturing, item variants (size/colour), cost centres,
multi-currency/export invoices, IMS actions, and a GSTR-9 working report.

## 2. Comparison tables

Legend: **Yes** / **Partial** / **No** / **In progress**. A "?" in a Vyapar or
BUSY cell means it could not be confirmed from vendor material.

### Billing

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| GST tax invoice, bill of supply for non-GST companies | Yes (0.1.0, `documents/gst-invoice-format.ts`) | Yes | Yes |
| Quotation → order → challan → invoice | Yes (`sales-documents/`, 0.4.0) | Yes | Yes (Standard) |
| Item and bill discount, bill sundry, round-off | Yes (`accounting/voucher-math.ts`) | Yes | Yes |
| Recurring invoices | Yes (0.5.0) | ? | ? |
| UPI QR on invoice, public share link | Yes (0.5.0) | Yes | ? |
| WhatsApp share and payment reminder | Partial (link share, overdue reminder) | Yes (WhatsApp/SMS, automatic reminders) | Partial |
| Barcode labels, scan to bill | Yes (0.5.0) | Yes | Yes |
| POS counter screen, thermal 58/80 mm print | No | Yes | Yes (Standard) |
| Multi-currency and export invoices (LUT/SEZ) | No | No | Yes (Standard) |
| Custom invoice templates | Partial (one layout, plus logo and terms) | Yes | Yes |
| Loyalty points | No | Yes (Platinum) | ? |

### GST compliance

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| GSTR-1 report and portal JSON (B2B, B2CL, B2CS, CDNR, HSN, docs) | Yes (0.4.0) | Yes | Yes |
| GSTR-3B working (3.1, 4) | Yes (0.4.0) | Yes | Yes |
| GSTR-2B reconciliation | Yes | ? | Yes |
| GSTR-1 vs portal reconciliation | Yes | ? | ? |
| IMS accept/reject/pending workflow | No | ? | ? |
| GSTR-9 / 9C working | No | Yes (GSTR-9) | Partial |
| GSTR-4 / CMP-08 (composition) | No | Yes (GSTR-4) | ? |
| Live e-invoice (IRN/QR) | Partial (unwired pseudo-IRN stub) | Yes | Yes (Standard) |
| E-way bill | **In progress** (offline JSON, this PR) | Yes (API; unlimited only on Platinum) | Yes (Standard) |
| RCM posting (liability + ITC) | Partial (flag only, no posting) | ? | Yes |
| HSN digits by turnover (4 vs 6) | Partial (accepts 4/6/8 digits, not enforced by AATO) | ? | ? |
| GST on expenses with ITC | Yes (0.5.0) | Yes | Yes |
| 40% and special rates | Yes (Unreleased) | ? | ? |
| Cess | No | ? | Yes |

### Inventory

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| Items with HSN, MRP, alternate unit | Yes | Yes | Yes |
| Multiple godowns, transfers | Yes (0.5.0) | Yes (Platinum) | Yes |
| Stock journal (count, write-off, transfer) | Yes (0.5.0) | Yes | Yes |
| Weighted-average valuation | Yes (0.2.0) | ? | Yes (several methods) |
| Party price lists | Yes | Partial | Yes |
| Reorder level, low stock | Yes (0.4.0) | Yes | Yes |
| Batch, mfg and expiry dates | No | Yes | Yes (Standard) |
| Serial / IMEI | No | Yes | Yes |
| Size / colour variants | No | Partial | Yes |
| BOM / manufacturing / job work | No | Yes | Yes (Standard) |

### Accounting

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| Double-entry ledger, journal and contra | Yes | Partial | Yes |
| Party opening balances and statements | Yes (0.5.0) | Yes | Yes |
| Bill-by-bill receipts and payments, advances | Yes (0.5.0) | Yes | Yes |
| Credit limit | Yes | ? | Yes |
| Cost centres | No | No | Yes |
| TDS / TCS | No | Yes | Partial (filing listed as "upcoming") |
| MSME 45-day payables (43B(h)) | No | ? | ? |
| Multi-company | Yes | Plan-gated | Yes |
| Branch consolidation, payroll | No | No | Yes (Enterprise) |
| Audit trail | Yes (0.5.0; ledger, price-list and delete events not covered yet) | ? | Yes |
| Tally XML export | Yes (0.5.0) | ? | ? |
| Import from Tally / BUSY masters | Yes (0.3.0) | ? | n/a |
| Import from Vyapar | No | n/a | n/a |

### Reports

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| Trial balance, P&L, balance sheet, day/cash book, ageing | Yes | Yes | Yes |
| Ledger statement for any account | Yes (0.5.0) | Yes | Yes |
| Item, customer and invoice profit | Yes (0.5.0) | Yes | Yes |
| Stock valuation, item stock history | Yes (0.5.0) | Yes | Yes |
| Ask AI in plain language | Yes (0.4.0) | No | No |
| Cash-flow / funds-flow, ratio analysis | No | ? | Yes |

### Banking

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| Bank reconciliation with CSV import | Yes | ? | Yes |
| Cheque / PDC register | Partial (cheque number only) | Yes | Yes |
| Cheque printing | No | ? | Yes |
| Bank feeds, payment links | No | Partial | No |

### Mobile / offline

| Feature | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| Mobile app | Partial (Expo app, online only) | Yes | Yes (companion app) |
| Offline billing with sync | No | Yes (core strength) | Yes (desktop) |
| OCR purchase-bill capture | Yes | No | No |

### Industry-specific

| Need | HisaabKro | Vyapar | BUSY 21 |
|---|---|---|---|
| Retail / POS | Partial (barcode and scan, no POS or thermal print) | Yes | Yes |
| Pharma (batch/expiry, drug licence on invoice) | No | Yes | Yes |
| Distribution (beat/salesman, schemes, price lists) | Partial | Partial | Yes |
| Manufacturing / BOM / job work | No | Yes | Yes |
| Garments size/colour | No | Partial | Yes |
| Jewellery (purity, making charges) | Partial (3% rate only) | ? | Yes |
| Restaurants (KOT, tables) | No | No | No |
| Services (no inventory, SAC, recurring) | Yes | Yes | Yes |

## 3. Ranked list of missing / partial features

The list is ordered by how much Indian SMBs need each item. Size is
engineering effort only: **S** ≤ 2 days, **M** ≤ 1 week, **L** 2–3 weeks,
**XL** > 3 weeks. GSP means a GST Suvidha Provider or IRP/NIC API credential
is needed.

| # | Feature | Class | Size | Third party |
|---|---|---|---|---|
| 1 | Live e-invoice (IRN + signed QR, cancel within 24 h) | Legally required (B2B once AATO > ₹5 cr; 30-day reporting limit for AATO ≥ ₹10 cr) | L | GSP/IRP |
| 2 | E-way bill | Legally required (goods movement > ₹50k; state limits vary) | M | None for offline JSON; GSP for live API |
| 3 | TDS on purchases and payments | Legally required for deductors (194Q buyers > ₹10 cr; contractor/professional TDS) | M | None |
| 4 | Batch / expiry tracking | Commonly expected (pharma, FMCG, food) | L | None |
| 5 | RCM posting | Legally required for notified RCM supplies (GTA, legal, rent, etc.) | S–M | None |
| 6 | Composition scheme mode | Legally required for composition dealers | M | None |
| 7 | Offline-tolerant billing | Commonly expected | XL | None |
| 8 | POS counter screen + thermal print | Commonly expected (retail) | M | None |
| 9 | Cost centres | Commonly expected by BUSY users | M | None |
| 10 | MSME 45-day payable tracker (43B(h)) | Legally relevant for buyers from micro/small suppliers | S | None |
| 11 | GSTR-9 working report | Legally required above ₹2 cr | M | None |
| 12 | IMS action helper | Commonly expected by accountants | M | GSP only for a live push |
| 13 | HSN digit enforcement by AATO | Legally required | S | None |
| 14 | BOM / production voucher | Commonly expected (light manufacturing) | L | None |
| 15 | Item variants (size/colour) | Commonly expected (garments, footwear) | L | None |
| 16 | Serial / IMEI tracking | Commonly expected (electronics) | M | None |
| 17 | Export / SEZ invoices, multi-currency | Legally required for exporters | L | None |
| 18 | Cess | Legally required for cess goods only (niche after GST 2.0) | S–M | None |
| 19 | PDC / cheque register, cheque printing | Nice-to-have | S–M | None |
| 20 | Vyapar data import | Nice-to-have (helps switchers) | M | None |
| 21 | Audit-trail completeness | Legally required for companies (Rule 3(1), Companies (Accounts) Rules) | S | None |
| 22 | Loyalty, online store, branches, payroll, KOT | Nice-to-have / out of scope | — | — |

Notes on each:

1. **Live e-invoice.** Direct NIC API access needs a large-taxpayer
   whitelist, so SMB SaaS normally goes through a GSP. Minimal version: an
   INV-01 JSON builder from a posted invoice; generate and cancel the IRN;
   print the IRN, Ack No. and QR on the invoice; warn before the 30-day
   limit. Replace the pseudo-hash stub, and never print fake IRNs on real
   invoices.
2. **E-way bill.** This PR adds the offline NIC bulk JSON. The live API
   needs a GSP.
3. **TDS.** TCS on sale of goods under 206C(1H) was **omitted from 1 Apr
   2025**, so don't build it. Minimal version: a TDS section master (code,
   rate, threshold), a TDS line on a purchase bill or payment that posts to
   TDS Payable, a party PAN check, and a quarterly TDS register CSV for the
   CA. Use the new Act's section references for transactions on or after 1
   Apr 2026.
4. **Batch / expiry.** Put batch number, mfg and expiry dates on stock
   movement lines, with a batch-wise stock view. Pick batches FEFO on sale,
   alert on expiry, and print batch and expiry on the invoice. This touches
   stock invariants, so build it test-first.
5. **RCM posting.** On a purchase bill with reverse charge set, post the
   output GST liability and the ITC (when eligible) instead of paying GST to
   the supplier. Feed GSTR-3B 3.1(d) and 4(A)(3).
6. **Composition.** Add a company GST scheme (regular or composition). Print
   the bill of supply with the composition line, post no ITC, compute
   CMP-08 tax on turnover each quarter, and add a GSTR-4 annual summary.
7. **Offline.** Numbering offline clashes with the no-gaps
   `document_sequences` rule. Minimal version: offline drafts that post when
   the connection is back, with numbers allocated at post time.
8. **POS.** A single scan-and-pay screen, a cash/UPI split, a thermal print
   layout and a default walk-in customer. It reuses the barcode code.
9. **Cost centres.** An optional cost-centre tag on ledger lines, plus a
   cost-centre P&L.
10. **MSME tracker.** Add the Udyam number and category to parties, and a
    payables report that flags bills unpaid after 15 or 45 days at year end.
11. **GSTR-9.** Group the existing GSTR-1/3B data by GSTR-9 table. 9C applies
    above ₹5 cr and is certified by a CA, so don't build it.
12. **IMS helper.** Import the IMS/2B JSON and suggest accept, reject or
    pending from the match with your books, building on the 2B
    reconciliation.
13. **HSN digits.** 6 digits when AATO > ₹5 cr, otherwise 4. Store the AATO
    band on the company and check item HSN length when an invoice is saved.
14. **BOM.** A BOM master and a production voucher that consumes raw
    materials and produces finished goods through stock movements at average
    cost.
15. **Variants.** A variant matrix on the item, an SKU and barcode for each
    variant, and matrix entry on the voucher grid.
16. **Serial / IMEI.** Build it after batch tracking (#4) and reuse that
    per-line attribute design.
17. **Export / SEZ.** LUT and with-payment flags, port code and shipping bill
    fields for GSTR-1 EXP/SEZ. Few target SMBs need it.
21. **Audit trail.** Close the gaps the roadmap lists (ledger postings, price
    lists, deletes), and make sure the log can't be switched off or edited.

**Housekeeping found during the review:** `alternatives-content.ts` still says
there is no BUSY import tool, but BUSY/EZY and Tally master import shipped in
0.3.0. The `docs/busy-21-gap-status.md` row "e-Invoice / e-way: Stub UI" is
out of date, since no router or UI calls the stub.

## 4. E-way bill rules used by the code

### Intra-state thresholds above ₹50,000

Main source: the myBillBook state table (last reviewed July 2026), checked
against Filing24 (2025) and Mondaq (2025). None of these were checked against
the state notifications themselves.

| State | Intra-state limit | Notes |
|---|---|---|
| Maharashtra | ₹1,00,000 | Three sources agree |
| Tamil Nadu | ₹1,00,000 | Three sources agree |
| Delhi | ₹1,00,000 | Two sources |
| Punjab | ₹1,00,000 (₹50,000 for specified goods) | Two sources |
| Rajasthan | ₹1,00,000 (₹2,00,000 within one city) | Two sources |
| Bihar | ₹1,00,000 | One source says ₹2 lakh; the lower figure is used |
| Jharkhand | ₹1,00,000 | One source |
| Madhya Pradesh | ₹1,00,000 (₹50,000 for specified goods) | One source |
| West Bengal | ₹50,000 since Dec 2023 | Date unverified |
| Kerala, Gujarat, Goa, Chhattisgarh, J&K | Only for listed goods, or none | The ₹50,000 default is kept, so the reminder errs on the safe side |
| All other states/UTs, and all inter-state movement | ₹50,000 | Rule 138(1) |

The app uses the general limit, and lower figures where sources conflict. It
shows the result as a reminder, never as a block.

### What counts toward the threshold (Rule 138)

The consignment value is the invoice value **including GST and cess**,
**excluding exempt goods** on the same invoice. Freight that the transporter
charges separately is not included.

### Validity (Rule 138(10), as amended from 1 Jan 2021)

You get 1 day for every 200 km or part of it (20 km for over-dimensional
cargo). Each day ends at **midnight of the day after the date of
generation**, so the default "valid until" date is the generation date plus N
days. Validity can be extended from 8 hours before to 8 hours after expiry,
and an e-way bill can be cancelled within 24 hours.

### NIC bulk-generation JSON

The format is version `1.0.0621`, with a `billLists[]` array whose items carry
`itemList[]`. The field list comes from the open-source India Compliance
(ERPNext) implementation, because the portal's "Attributes and JSON Document"
couldn't be downloaded. Codes: `supplyType` O/I; `subSupplyType` 1 Supply,
4 Job Work, 5 For Own Use, 8 Others (needs a description), 10 Line Sales,
11 Recipient Not Known, 12 Exhibition or Fairs; `docType` INV/BIL/CHL;
`transType` 1 Regular; `transMode` 1 Road, 2 Rail, 3 Air, 4 Ship;
`vehicleType` R/O. The distance cap is 4,000 km (from Tally's help, not
confirmed with NIC). A distance of 0 lets the portal work it out from the PIN
codes.

### 2025–26 changes

- From 1 Jan 2025, an e-way bill can only be generated for documents up to
  180 days old, and validity can be extended up to 360 days from generation.
- A mandatory Ship-To GSTIN for Bill To–Ship To movements was put **on hold**
  on 29 Jul 2026.

## Open questions

- None of the state thresholds were checked against the state's own
  notification (open conflicts: Bihar, and the West Bengal date).
- The current official NIC JSON version string and the 4,000 km cap.
- Vyapar's current plan prices and feature gating.
- Whether BUSY 21 has serial-number tracking or TDS filing.
- Whether IMS action is mandatory in 2026 (sources disagree).
- Section references under the Income-tax Act 2025 (43B(h) successor, the
  194Q/194C entries in s.393). Check the Act text before hard-coding them.

## Sources

**Vendors**
- BUSY pricing and features: https://busy.in/pricing.md, https://busy.in/products, https://busy.in/explore-more-features, https://busy.in/accounting-software/manufacturing/, https://busy.in/accounting-software/jewellery-shop.md
- Vyapar: https://vyaparapp.in/llms.txt, https://vyaparapp.in/manufacturing, https://vyaparapp.in/guides/how-to-generate-e-invoices-in-vyapar-app, https://vyaparapp.in/videos/how-to-generate-e-way-bill
- Vyapar pricing (third-party): https://www.techjockey.com/detail/vyapar, https://www.capterra.com/p/180579/Vyapar/pricing/

**Legal**
- E-invoice 30-day rule (GSTN advisory, 5 Nov 2024): https://www.mahagst.gov.in/public/uploads/gstnadvisory/1760531580_293%20Advisory%20Time%20Limit%20for%20Reporting%20e%20Invoice%20on%20the%20IRP%20Portal%20%20Lowering%20of%20Threshold%20to%20AATO%2010%20Crores%20and%20Above.pdf
- E-invoice threshold ₹5 cr: https://tallysolutions.com/gst/e-invoicing-limit-india/
- 206C(1H) omitted, 194Q continues: https://www.incometaxindia.gov.in/w/tds-on-purchase-of-goods, https://taxguru.in/income-tax/tcs-sale-goods-removed-april-1-2025-faqs.html
- Income-tax Act 2025: https://cleartax.in/s/tds-and-tcs-changes-from-april-2026
- HSN by AATO, Table 12: https://www.mahagst.gov.in/public/uploads/gstnadvisory/1760596735_345%20Reporting%20of%20HSN%20codes%20in%20Table%2012%20and%20list%20of%20documents%20in%20table%2013%20of%20GSTR%201%201A.pdf
- GSTR-9 exemption ≤ ₹2 cr: https://www.taxmann.com/post/blog/cbic-exempts-small-taxpayers-from-filing-annual-gst-return-gstr-9
- IMS: https://tallysolutions.com/gst/ims-impact-on-gstr-2b-gstr-3b/, https://cleartax.in/s/faqs-on-invoice-management-system-ims-gst
- 43B(h): https://cleartax.in/s/section-43bh-of-income-tax-act
- MCA audit trail: https://cajournal.icai.org/article-details/audit-trail-requirements-responsibilities
- Rule 46: https://taxinformation.cbic.gov.in/content/html/tax_repository/gst/rules/cgst_rules/active/chapter6/rule46_v1.00.html
- E-way bill state limits: https://mybillbook.in/s/eway-bill-limit/, https://www.filing24.in/gst/e-way-bill-limit-2025-state-wise-thresholds-rules-who-should-generate-it/, https://www.mondaq.com/india/tax-authorities/1615944/eway-bill-limit-2025-state-wise-list-thresholds
- Rule 138 value: https://www.gstcouncil.gov.in/sites/default/files/2024-02/electronic-way-bill-050819.pdf
- Validity: https://gstcouncil.gov.in/sites/default/files/2024-10/22.26th_gst_press_information_bureau.pdf, https://www.mastersindia.co/blog/guide-e-way-bill-gst-rules-validity/
- NIC JSON fields: https://github.com/resilient-tech/india-compliance (`gst_india/utils/e_waybill.py`)
- Distance cap: https://help.tallysolutions.com/incorrect-pin-to-pin-distance/
- 180/360-day limits: https://www.mahagst.gov.in/public/uploads/gstnadvisory/1760530021_309.Advisory%20on%20Updates%20to%20E-Way%20Bill%20and%20E-Invoice%20Systems.pdf
- Ship-To GSTIN on hold: https://taxguru.in/goods-and-service-tax/gstn-hold-rollout-proposed-bill-enhancements.html
