# BUSY 21 Feature Gap — Status (Jul 2026)

Living status vs [BUSY 21](https://busy.in/) wholesale/trading features. The original Cursor plan phases 1–6 are complete; this doc tracks remaining parity.

## Parity summary

| Area | Status | Notes |
|------|--------|-------|
| Multi-row voucher grid + Enter nav | Done | Qty → Rate → Disc → next row |
| Tax inclusive / exclusive | Done | Back-calc in `voucher-math.ts` |
| Item-wise + bill discount | Done | Persisted end-to-end |
| Bill sundry (freight, packing, round-off) | Done | Posted to ledger |
| Godown on voucher | Done | Stock movements routed |
| F2 party/item lookup | Done | `MasterLookup` |
| Post-save preview + print/PDF | Done | Clean print layout (no sidebar) |
| Sales / purchase registers | Done | List + filters + tooltips |
| Payments & receipts | Done | Allocate to open docs |
| Returns / credit-debit notes | Done | Document picker |
| Expenses | Done | Cash/bank payment |
| GSTR-1 / GSTR-3B working reports | Done | Reports UI |
| Trial balance, P&L, balance sheet, ageing | Done | Reports UI |
| Day book / cash book | Done | Reports tabs |
| HSN summary | Done | Reports tab |
| Accountant export pack | Done | JSON download from Reports |
| Item master (HSN, units, MRP, opening stock) | Done | |
| Godowns + price lists | Done | Service + masters |
| Invoice cancel | Done | Sales list |
| Audit trail viewer | Done | Settings |
| Journal / contra UI | Done | `/app/accounting/journal` |
| Sales documents (quote/order/challan) | Done | `/app/sales/documents` |
| Purchase orders | Done | `/app/purchase-orders` |
| PO → GRN → purchase bill | Done | GRN at `/app/purchase-grns`; convert to bill |
| Quotation → invoice | Done | Sales documents → `/app/sales/new?fromDocument=` |
| Per-line godown on voucher | Done | Godown column per row in voucher grid |
| Price list auto-rate | Done | Party price list applies on item pick |
| Credit limit on party | Done | Blocked on credit sales in service |
| CSV import (parties, opening stock) | Partial | No BUSY/EZY native format |
| Bill attachment + OCR | Partial | Metadata service; purchase upload optional |
| Role-based permissions | Partial | Types exist; not on all mutations |
| e-Invoice / e-way / GSTR-2B | Stub | Beyond MVP |
| POS / barcode / BOM | Not started | Later |

## Still open (priority)

### P1 — BUSY workflow depth
_All four P1 workflow items are complete (Jul 2026)._

### P2 — Data & compliance
5. Drizzle persistence for sequences, attachments, FY, memberships, expenses, sales docs, POs
6. `mutatingProcedure` on all posting mutations
7. Native BUSY/EZY import

### P3 — Later BUSY parity
8. OCR draft UI on purchase
9. POS / barcode / BOM
10. Live e-invoice / e-way integrations

## What not to rebuild

Core voucher engine, preview/print, returns, GST posting, and standard reports are **done**. Extend only for the items above or bug fixes.
