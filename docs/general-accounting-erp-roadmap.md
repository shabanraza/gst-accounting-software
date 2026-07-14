# General Accounting Software Roadmap: BUSY-Like GST ERP

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a general Indian accounting, GST, inventory, purchase, sales, and business operations SaaS that can support any normal business, while using the wholesale fabric business as the first real validation customer.

**Architecture:** Use TanStack Start for the full-stack app, PostgreSQL with Drizzle for persistence, and a service/domain layer for accounting rules. UI route files must only compose screens; accounting, GST, stock, OCR, and posting rules must live in focused service modules with tests.

**Tech Stack:** TanStack Start, React, TypeScript, Drizzle ORM, PostgreSQL/Neon, Cloudflare Workers, Cloudflare R2/S3-compatible storage for bill images, shadcn/ui, Tailwind, Vitest.

## Implementation status (Jul 2026)

See also `docs/busy-21-gap-status.md` for BUSY 21 parity detail.

### Phase completion

| Phase                        | Status      | Notes                                                                       |
| ---------------------------- | ----------- | --------------------------------------------------------------------------- |
| **1 — Foundation**           | Done        | Auth, companies, COA templates, FY, memberships, audit, sequences           |
| **1.5 — Shell & routes**     | Done        | `/app/*`, login/signup/onboarding, document sequences, attachment/OCR stubs |
| **2 — Accounting core**      | Done        | Posting engine, journal/contra, day/cash book, TB, P&L, BS, ageing          |
| **3 — Sales, purchase, GST** | Done        | Invoices, bills, GST calc, returns, notes, GSTR-1/3B, HSN, CA export        |
| **4 — Inventory**            | Mostly done | Items, HSN, stock movements, godowns, price lists; batch/barcode later      |
| **5 — Orders & ops**         | Done        | Quote/order/challan, PO→GRN→bill, attachments metadata, per-line godown     |
| **6 — Migration & import**   | Partial     | CSV parties/stock/items; no native BUSY/EZY; dry-run partial                |
| **7 — SaaS productization**  | Partial     | Backup JSON export; no subscriptions, GSP, or mobile                        |

### MVP checklist (roadmap § MVP Priority)

| Must have                        | Status                         |
| -------------------------------- | ------------------------------ |
| Multi-company                    | Done                           |
| Double-entry ledger              | Done                           |
| Parties                          | Done                           |
| Sales invoice                    | Done                           |
| Purchase bill                    | Done                           |
| Payments & receipts              | Done                           |
| Expenses                         | Done                           |
| Inventory                        | Done                           |
| GST calculation                  | Done                           |
| Sales/purchase returns           | Done                           |
| GSTR-1 & GSTR-3B working reports | Done                           |
| Opening import                   | Partial (CSV, not BUSY native) |
| Dashboard                        | Done                           |

| Should have      | Status                                                        |
| ---------------- | ------------------------------------------------------------- |
| Orders, challans | Done                                                          |
| Credit limits    | Done                                                          |
| Aging            | Done                                                          |
| Stock valuation  | Partial (movements; no dedicated valuation report)            |
| Bill attachments | Partial (metadata; R2 upload stub)                            |
| Audit log        | Done                                                          |
| Role permissions | Partial (`mutatingProcedure` on key mutations; not universal) |

| Later (explicitly out of MVP) | Not started |
| Direct GST filing, e-invoice/e-way APIs, bank recon, payroll, BOM, POS, barcode, CRM |

### Still open before “production complete”

1. Run `bun run db:migrate` for migrations `0003`–`0004` on Neon
2. Full Drizzle persistence for all dual-mode repos (some still in-memory fallback)
3. Native BUSY/EZY import (Phase 6)
4. OCR review UI + confirm-to-bill flow (OCR V2)
5. R2 file upload for bill images (not just metadata)
6. Universal `mutatingProcedure` + role checks on every posting mutation
7. Phase 7: subscriptions, onboarding wizard polish, scheduled backups

### TDD task checklist below

Tasks 1–15 in this document have corresponding services and tests in `src/features/` — the `- [ ]` boxes are **documentation debt**; use the tables above as the live status source.

## Global Constraints

- India GST is the first compliance target.
- The product is cloud web SaaS first; mobile app comes later.
- The product must support multiple companies under one account.
- Every data table that stores business records must be company-aware using `company_id`.
- Every accounting-impacting action must post through one central double-entry ledger engine.
- Sales, purchases, payments, returns, stock movements, and OCR-confirmed postings must use database transactions.
- GST amounts must be stored separately from inventory cost and party balances.
- Stock must move only through stock movement records.
- Current stock, party balances, GST summaries, and dashboard numbers should use summary/cache tables.
- Invoice number generation must use safe sequence logic, never `COUNT(*) + 1`.
- OCR must create reviewable drafts; it must not post accounting entries without user confirmation.
- Direct GST filing, e-invoice API, and e-way bill API are not part of MVP.
- Money and tax values must use decimal-safe arithmetic, not floating point math.
- Ledger-impacting documents should be cancelled/reversed with audit history, not hard-deleted.
- User permissions must prevent unauthorized company, branch, ledger, invoice, and report access.
- Document files such as supplier bills must be stored outside the database with metadata and access control.
- Backup, export, and restore strategy must be designed before production use.

---

## Product Summary

Build this as a general Indian accounting and inventory SaaS, not only a cloth-business tool. The product should support GST-registered and non-GST businesses across trading, wholesale, retail, services, distribution, light manufacturing, and multi-branch operations.

The first real customer workflow is a wholesale fabric business: purchase goods from suppliers, attach hard-copy bills, manage stock in business-specific units, sell to retailers with GST, track receivables/payables, and generate GST-ready reports.

GST baseline for v1:

- GST invoice creation.
- GSTR-1-ready outward supply reports.
- GSTR-3B-ready tax liability and ITC summaries.
- HSN/SAC summaries.
- Credit note and debit note support.
- Accountant/CA export.
- No direct government filing in MVP.

Official GST references:

- [GSTR-1](https://tutorial.gst.gov.in/userguide/returns/GSTR_1.htm)
- [GSTR-3B](https://tutorial.gst.gov.in/userguide/returns/GSTR3B.htm)
- [e-Invoice portal](https://einvoice1.gst.gov.in/)
- [e-Way Bill portal](https://ewaybillgst.gov.in/)

## Core Product Model

### Multi-Company First

One user account can manage many businesses. Each company must have separate:

- Legal name and trade name.
- GSTIN or non-GST status.
- State.
- Financial year.
- Books and ledgers.
- Invoice series.
- Users and roles.
- Settings.
- Audit history.

### Double-Entry Accounting Core

Every sale, purchase, payment, receipt, expense, return, tax adjustment, journal, contra, and stock valuation event must post through a central ledger engine.

The system should never update party balances or financial reports directly from UI forms. UI forms create business documents; business documents call services; services create ledger postings and summary updates inside transactions.

### Business-Type Setup

During company setup, choose a business profile:

- Trading.
- Wholesale.
- Retail.
- Services.
- Distribution.
- Manufacturing-light.
- Custom.

This profile controls default modules, invoice format, item fields, inventory behavior, and report presets.

### GST Configuration

The software should support:

- Regular GST.
- Composition taxpayer mode later.
- Unregistered/non-GST company mode.
- B2B and B2C sales.
- Local and interstate tax logic.
- CGST, SGST, IGST.
- HSN/SAC.
- Input GST/ITC.
- Output GST.
- Reverse charge later.
- Export/SEZ later.

### Inventory Modes

Inventory should be configurable per company and per item:

- No inventory for service businesses.
- Simple stock.
- Batch/lot stock.
- Serial number stock later.
- Size/color/design stock.
- Unit conversion stock.
- Fabric-specific meter/thaan/piece support.
- Manufacturing/assembly-lite later.

## Business Workflows

### Purchase From Supplier With Hard-Copy Bill

When the business buys goods from a supplier and has a hard-copy bill:

1. Open `Purchase -> New Purchase Bill`.
2. Select or create supplier.
3. Enter supplier bill number, bill date, due date, GSTIN, and place of supply.
4. Attach bill image or PDF.
5. Add purchased items manually, or use OCR draft extraction when available.
6. Review taxable value, GST breakup, freight/charges, discount, round-off, and bill total.
7. Save and post the purchase bill.

On confirmed save, the system must update:

- Inventory stock in.
- Purchase ledger.
- Input GST/ITC.
- Supplier payable.
- Stock movement ledger.
- Dashboard summaries.

Example:

Supplier bill:

- Cotton Fabric: 100 meters.
- Purchase rate: Rs. 80/meter.
- Taxable value: Rs. 8,000.
- GST 5%: Rs. 400.
- Bill total: Rs. 8,400.

System records:

- Stock increases by 100 meters.
- Purchase value increases by Rs. 8,000.
- Input GST increases by Rs. 400.
- Supplier payable increases by Rs. 8,400.

### OCR Purchase Bill Workflow

OCR is an assisted-entry feature, not an automatic accounting feature.

#### OCR V1: Attachment Only

- User uploads bill image/PDF.
- File is stored and linked to the purchase bill.
- User manually enters all bill details.

#### OCR V2: Draft Extraction

- User uploads bill image/PDF.
- OCR creates a draft with extracted fields:
  - Supplier name.
  - Supplier GSTIN.
  - Bill number.
  - Bill date.
  - Taxable amount.
  - GST amount.
  - CGST/SGST/IGST breakup.
  - Total amount.
  - Item rows where possible.
- Each extracted field stores confidence.
- Low-confidence fields are highlighted.
- User must review and confirm before posting.

#### OCR V3: Supplier Format Learning

- System remembers supplier bill formats.
- Item mapping suggestions improve over time.
- Repeated supplier invoices become faster to enter.

#### OCR V4: Order/Receipt Matching

- OCR draft can be matched with purchase order or goods receipt.
- Mismatches are flagged before posting.

### Sale To Retailer

When the business sells purchased goods to a retailer:

1. Open `Sales -> New Sales Invoice`.
2. Select or create customer.
3. Confirm GSTIN, state, billing/shipping address, and payment terms.
4. Add items being sold.
5. System calculates tax based on local/interstate sale.
6. Save and post invoice.
7. Record payment immediately or keep customer outstanding.

Example:

Sell 20 meters from the 100 meters purchased above:

- Sale rate: Rs. 120/meter.
- Taxable value: Rs. 2,400.
- GST 5%: Rs. 120.
- Invoice total: Rs. 2,520.

System records:

- Stock decreases by 20 meters.
- Sales ledger increases by Rs. 2,400.
- Output GST increases by Rs. 120.
- Customer receivable or cash/bank increases by Rs. 2,520.
- Gross profit is Rs. 800 before expenses because purchase cost was Rs. 80/meter and sale rate was Rs. 120/meter.

Full chain:

```text
Purchase Bill -> Stock In -> Input GST -> Supplier Payable
Sales Invoice -> Stock Out -> Output GST -> Customer Receivable/Cash -> Profit Report
```

## What Businesses Actually Do In This Software

- **Daily billing:** GST/non-GST sales invoices, counter sales, wholesale invoices, service invoices, estimates, quotations, proforma invoices, delivery challans, and sales orders.
- **Purchasing:** purchase orders, purchase bills, goods receipt notes, supplier returns, debit notes, expense-linked purchases, and ITC tracking.
- **Payments:** customer receipts, supplier payments, cash/bank/UPI transactions, payment allocation, partial payments, advances, refunds, and bank transfers.
- **Inventory:** item/service master, HSN/SAC, GST rates, MRP, sale price, purchase price, stock movements, opening stock, adjustments, damaged stock, low-stock alerts, valuation, and item-wise profit.
- **Parties:** customers, suppliers, brokers, agents, transporters, GSTIN, ledgers, credit limits, payment terms, shipping addresses, outstanding balances, and aging.
- **Returns and notes:** sales return, purchase return, credit note, debit note, rate difference, discount after sale, damaged goods return, GST impact, stock impact, and party balance impact.
- **Expenses:** rent, salary, transport, loading, packing, electricity, office expense, repair, bank charges, and professional fees, with or without GST.
- **Compliance:** GSTR-1 working report, GSTR-3B working report, HSN/SAC summary, tax liability, ITC summary, B2B/B2C breakup, nil/exempt/non-GST reporting, invoice validation, and accountant exports.
- **Owner controls:** dashboard, cash/bank balance, receivable/payable, sales trend, purchase trend, GST payable, expense watch, low stock, profit snapshot, top customers, top items, and overdue parties.
- **Administration:** user roles, audit log, approvals, invoice cancellation, data import/export, backups, branch/warehouse setup, and activity history.

## Additional Items Not To Miss

- **Money precision:** use decimal-safe calculations for rates, discounts, GST, round-off, ledger totals, and stock valuation.
- **Cancellation and reversal:** do not silently delete posted invoices, payments, or purchase bills; create cancellation/reversal entries with audit history.
- **User permissions:** define owner, admin, accountant, billing user, inventory user, and read-only roles.
- **Branch and warehouse access:** users may be restricted to selected branches or warehouses.
- **Document storage:** supplier bill photos, invoice PDFs, and OCR source files should use R2/S3-style object storage with database metadata.
- **Backup and restore:** production needs scheduled backups, export packs, and restore testing.
- **Bank reconciliation:** bank statement import and matching is not MVP-critical, but the accounting model should allow it later.
- **Data export:** accountant-friendly exports should include ledgers, sales, purchases, GST summaries, stock, and party outstanding.
- **Audit trail:** store who created, edited, cancelled, approved, or imported business documents.
- **Decimal and timezone policy:** standardize decimal scale, financial year dates, document dates, and created-at timestamps.

## Build Phases

### Phase 1: Foundation

- Auth.
- Tenant/company setup.
- GST/company profile.
- Financial year.
- Users and roles.
- Audit log.
- Chart of accounts templates by business type.
- Safe invoice numbering by company, financial year, voucher type, and series.

### Phase 1.5: Product shell and auth routes (added)

- Canonical routes under `/app/*` (not `/design/*`).
- Login / signup / onboarding flow with better-auth session.
- `protectedProcedure` binds `accountId` from session user id.
- Company create seeds COA + financial year + owner membership + audit event.
- Document sequence service (no `COUNT(*) + 1`).
- Attachment metadata + R2/object-storage adapter stub.
- OCR draft storage stub (reviewable, never auto-posts).

See also: `docs/routing-and-auth.md`.

### Phase 2: Accounting Core

- Ledger accounts.
- Parties.
- Vouchers.
- Receipts.
- Payments.
- Journal.
- Contra.
- Central posting engine.
- Ledger statement.
- Day book.
- Cash/bank book.
- Trial balance.
- P&L.
- Balance sheet.
- Receivable/payable aging.

### Phase 3: Sales, Purchase, GST

- Sales invoice.
- Purchase bill.
- GST calculation.
- CGST/SGST/IGST.
- Discounts.
- Freight/charges.
- Round-off.
- Credit/debit notes.
- Sales return.
- Purchase return.
- GSTR-1 working report.
- GSTR-3B working report.

### Phase 4: Inventory

- Item/service master.
- HSN/SAC.
- GST rate.
- Unit rules.
- Opening stock.
- Stock ledger.
- Current stock cache.
- Stock valuation.
- Low-stock alerts.
- Fabric meter/thaan/piece extension.
- Retail barcode later.
- Batch/expiry later.
- Size/color later.

### Phase 5: Orders And Operations

- Quotation -> sales order -> challan -> invoice -> receipt.
- Purchase order -> goods receipt -> purchase bill -> payment.
- Transporter details.
- Broker/agent.
- Dispatch tracking.
- Document attachments.

### Phase 6: Migration And Import

- Import masters from BUSY, EZY, and Excel.
- Parties.
- Ledgers.
- Items.
- Opening balances.
- Opening stock.
- GST rates.
- HSN/SAC.
- Dry-run import with error report before committing data.

### Phase 7: SaaS Productization

- Subscription plans.
- Onboarding wizard.
- Company templates.
- Admin/support dashboard.
- Accountant access.
- Backups.
- Export packs.
- Later: e-invoice, e-way bill, GST portal/GSP integration, bank feed reconciliation, and mobile app.

## MVP Priority

### Must Have

- Multi-company.
- Double-entry ledger.
- Parties.
- Sales invoice.
- Purchase bill.
- Payments and receipts.
- Expenses.
- Inventory.
- GST calculation.
- Sales returns and purchase returns.
- GSTR-1 and GSTR-3B working reports.
- Opening import.
- Dashboard.

### Should Have

- Orders.
- Challans.
- Credit limits.
- Aging.
- Stock valuation.
- Bill attachments.
- Audit log.
- Role permissions.

### Later

- Direct GST filing.
- E-invoice API.
- E-way bill API.
- Bank reconciliation automation.
- Payroll.
- Manufacturing BOM.
- POS.
- Barcode.
- CRM.
- Advanced analytics.

## TDD Implementation Plan

### Task 1: Company Foundation

**Files to create or modify later:**

- `src/features/companies/`
- `src/db/schema.ts`
- `src/features/companies/company-service.test.ts`

**Interfaces to design:**

```ts
type CompanyInput = {
  legalName: string
  tradeName: string
  gstin?: string
  stateCode: string
  financialYearStart: string
  businessType:
    | 'trading'
    | 'wholesale'
    | 'retail'
    | 'services'
    | 'distribution'
    | 'manufacturing_light'
    | 'custom'
}
```

- [ ] Write a failing test that creates two companies under one account.
- [ ] Assert each company has its own GSTIN/settings scope.
- [ ] Implement minimal company creation service.
- [ ] Verify company isolation test passes.
- [ ] Add test for duplicate GSTIN handling within an account.
- [ ] Implement duplicate validation.
- [ ] Commit foundation company setup.

### Task 2: Chart Of Accounts

**Files to create or modify later:**

- `src/features/accounting/chart-of-accounts.ts`
- `src/features/accounting/chart-of-accounts.test.ts`
- `src/db/schema.ts`

- [ ] Write a failing test that creates default ledgers for a trading company.
- [ ] Expected ledgers include Sales, Purchase, Cash, Bank, Customer Receivable, Supplier Payable, Input GST, Output GST, Stock In Hand, Expenses.
- [ ] Implement default chart template.
- [ ] Verify test passes.
- [ ] Write a failing test for service company chart without stock ledgers by default.
- [ ] Implement business-type-specific chart setup.
- [ ] Commit chart of accounts setup.

### Task 3: Central Ledger Posting Engine

**Files to create or modify later:**

- `src/features/accounting/posting-engine.ts`
- `src/features/accounting/posting-engine.test.ts`
- `src/db/schema.ts`

**Core rule:** every posting must balance debit and credit.

- [ ] Write a failing test for balanced journal posting.
- [ ] Expected: total debit equals total credit.
- [ ] Implement minimal `postLedgerEntry()` service.
- [ ] Verify balanced posting passes.
- [ ] Write a failing test that rejects unbalanced posting.
- [ ] Implement rejection for unbalanced entries.
- [ ] Write a failing test that all posted entries include `company_id`.
- [ ] Implement company scoping.
- [ ] Commit central posting engine.

### Task 4: Parties

**Files to create or modify later:**

- `src/features/parties/party-service.ts`
- `src/features/parties/party-service.test.ts`
- `src/db/schema.ts`

- [ ] Write a failing test that creates a customer with GSTIN, state, credit limit, and payment terms.
- [ ] Implement minimal party creation service.
- [ ] Verify customer creation passes.
- [ ] Write a failing test that creates a supplier with GSTIN and payable account mapping.
- [ ] Implement supplier setup.
- [ ] Write a failing test that same party names can exist in different companies.
- [ ] Implement company-scoped uniqueness.
- [ ] Commit party management.

### Task 5: Item And Inventory Foundation

**Files to create or modify later:**

- `src/features/inventory/item-service.ts`
- `src/features/inventory/stock-movement-service.ts`
- `src/features/inventory/inventory.test.ts`
- `src/db/schema.ts`

- [ ] Write a failing test that creates an item with HSN, GST rate, base unit, purchase rate, and sale rate.
- [ ] Implement item creation.
- [ ] Verify item test passes.
- [ ] Write a failing test that stock can only change through stock movement records.
- [ ] Implement stock movement service.
- [ ] Write a failing test for opening stock.
- [ ] Implement opening stock movement.
- [ ] Commit inventory foundation.

### Task 6: Purchase Bill Manual Entry

**Files to create or modify later:**

- `src/features/purchases/purchase-bill-service.ts`
- `src/features/purchases/purchase-bill-service.test.ts`
- `src/features/accounting/posting-engine.ts`
- `src/features/inventory/stock-movement-service.ts`

**Scenario:** supplier bill for stock purchase with GST.

- [ ] Write a failing test: purchase bill for 100 meters at Rs. 80 with 5% GST.
- [ ] Expected stock increases by 100 meters.
- [ ] Expected purchase ledger is Rs. 8,000.
- [ ] Expected input GST is Rs. 400.
- [ ] Expected supplier payable is Rs. 8,400.
- [ ] Implement minimal purchase bill service in one database transaction.
- [ ] Verify purchase bill test passes.
- [ ] Write a failing test that duplicate supplier bill number is blocked for same supplier/company/financial year.
- [ ] Implement duplicate bill validation.
- [ ] Commit purchase bill manual entry.

### Task 7: Hard-Copy Bill Attachment

**Files to create or modify later:**

- `src/features/documents/document-attachment-service.ts`
- `src/features/documents/document-attachment-service.test.ts`
- `src/db/schema.ts`

- [ ] Write a failing test that attaches a bill image/PDF to a purchase bill.
- [ ] Expected attachment stores file key, original filename, content type, size, linked document type, linked document id, and company id.
- [ ] Implement attachment metadata service.
- [ ] Verify attachment test passes.
- [ ] Write a failing test that attachment cannot be linked across companies.
- [ ] Implement company isolation check.
- [ ] Commit hard-copy bill attachment.

### Task 8: OCR Draft Extraction

**Files to create or modify later:**

- `src/features/ocr/ocr-draft-service.ts`
- `src/features/ocr/ocr-draft-service.test.ts`
- `src/db/schema.ts`

**Rule:** OCR drafts do not post accounting entries.

- [ ] Write a failing test that stores OCR-extracted supplier GSTIN, bill number, bill date, taxable amount, GST amount, and total amount.
- [ ] Expected every extracted field can store confidence.
- [ ] Implement OCR draft storage.
- [ ] Verify OCR draft storage passes.
- [ ] Write a failing test that low-confidence fields are marked for review.
- [ ] Implement low-confidence review status.
- [ ] Write a failing test that OCR draft confirmation creates a normal purchase bill only after user confirmation.
- [ ] Implement draft-to-purchase-bill conversion through the purchase bill service.
- [ ] Commit OCR draft workflow.

### Task 9: Sales Invoice

**Files to create or modify later:**

- `src/features/sales/sales-invoice-service.ts`
- `src/features/sales/sales-invoice-service.test.ts`
- `src/features/accounting/posting-engine.ts`
- `src/features/inventory/stock-movement-service.ts`

**Scenario:** sell 20 meters from stock to a retailer with GST.

- [ ] Write a failing test: sales invoice for 20 meters at Rs. 120 with 5% GST.
- [ ] Expected stock decreases by 20 meters.
- [ ] Expected sales ledger is Rs. 2,400.
- [ ] Expected output GST is Rs. 120.
- [ ] Expected customer receivable is Rs. 2,520 for credit sale.
- [ ] Implement minimal sales invoice service in one database transaction.
- [ ] Verify sales invoice test passes.
- [ ] Write a failing test for cash sale where receivable is not created.
- [ ] Implement payment mode handling.
- [ ] Commit sales invoice workflow.

### Task 10: GST Calculation

**Files to create or modify later:**

- `src/features/gst/gst-calculator.ts`
- `src/features/gst/gst-calculator.test.ts`

- [ ] Write a failing test for same-state sale: GST splits into CGST and SGST.
- [ ] Implement same-state tax split.
- [ ] Verify test passes.
- [ ] Write a failing test for interstate sale: GST becomes IGST.
- [ ] Implement interstate GST calculation.
- [ ] Write a failing test for round-off to 2 decimals.
- [ ] Implement decimal-safe rounding.
- [ ] Commit GST calculator.

### Task 11: Receipts And Payments

**Files to create or modify later:**

- `src/features/payments/payment-service.ts`
- `src/features/payments/payment-service.test.ts`

- [ ] Write a failing test for full customer receipt against one invoice.
- [ ] Implement receipt allocation.
- [ ] Verify invoice status becomes Paid.
- [ ] Write a failing test for partial receipt.
- [ ] Implement part-paid status and outstanding balance.
- [ ] Write a failing test for supplier payment against purchase bill.
- [ ] Implement supplier payment allocation.
- [ ] Commit receipts and payments.

### Task 12: Returns And Notes

**Files to create or modify later:**

- `src/features/returns/sales-return-service.ts`
- `src/features/returns/purchase-return-service.ts`
- `src/features/returns/returns.test.ts`

- [ ] Write a failing test for sales return.
- [ ] Expected stock increases, output GST reverses, customer balance reduces.
- [ ] Implement sales return service.
- [ ] Verify sales return test passes.
- [ ] Write a failing test for purchase return.
- [ ] Expected stock decreases, input GST reverses, supplier balance reduces.
- [ ] Implement purchase return service.
- [ ] Commit returns and notes.

### Task 13: GST Reports

**Files to create or modify later:**

- `src/features/gst/gstr1-report-service.ts`
- `src/features/gst/gstr3b-report-service.ts`
- `src/features/gst/gst-report-service.test.ts`

- [ ] Write a failing test that GSTR-1 includes B2B invoice-level outward supplies.
- [ ] Implement GSTR-1 sales summary builder.
- [ ] Verify GSTR-1 test passes.
- [ ] Write a failing test that GSTR-1 includes credit/debit notes.
- [ ] Implement note reporting.
- [ ] Write a failing test that GSTR-3B summarizes output GST and input GST.
- [ ] Implement GSTR-3B working summary.
- [ ] Commit GST reports.

### Task 14: Dashboard Summary Tables

**Files to create or modify later:**

- `src/features/dashboard/dashboard-summary-service.ts`
- `src/features/dashboard/dashboard-summary-service.test.ts`
- `src/features/app-shell/`

- [ ] Write a failing test that sales invoice updates daily sales summary.
- [ ] Implement daily summary update.
- [ ] Verify test passes.
- [ ] Write a failing test that purchase bill updates payable and stock summary.
- [ ] Implement purchase summary update.
- [ ] Write a failing test that dashboard reads summary tables, not raw invoices.
- [ ] Implement dashboard query service.
- [ ] Commit dashboard summaries.

### Task 15: Import And Migration

**Files to create or modify later:**

- `src/features/imports/import-dry-run-service.ts`
- `src/features/imports/import-dry-run-service.test.ts`

- [ ] Write a failing test for dry-run import of parties from CSV/Excel-normalized rows.
- [ ] Expected invalid rows return errors without writing data.
- [ ] Implement import dry-run validation.
- [ ] Verify no data is written during dry run.
- [ ] Write a failing test for opening stock import validation.
- [ ] Implement stock import validation.
- [ ] Commit import dry-run workflow.

## General Test Plan

- Run focused Vitest files for each module during development.
- Run full `bun run test` before completing each phase.
- Run `bun run lint` before merging.
- Run `bun run build` after major feature groups.
- Review GST outputs with a CA before using real filing data.

## Acceptance Criteria

- Manual supplier purchase bill can be entered from hard-copy bill.
- Supplier bill image/PDF can be attached.
- OCR can create reviewable draft data but cannot auto-post without confirmation.
- Purchase bill posts stock, input GST, purchase ledger, and supplier payable.
- Sales invoice posts stock-out, output GST, sales ledger, and customer receivable/cash.
- Payment status supports Paid, Part paid, and Pending.
- GSTR-1 and GSTR-3B working reports can be generated from posted documents.
- All module implementation follows test-first TDD.

## Implementation Notes

- Start with services and tests before UI screens.
- Keep accounting logic out of route files and UI components.
- Keep OCR data separate from confirmed accounting data.
- Keep GST logic in dedicated GST modules.
- Keep stock movement as the only path for stock changes.
- Keep summary tables updated transactionally.
