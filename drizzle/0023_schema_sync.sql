-- Columns and indexes that src/db/schema.ts defines and existing databases
-- already have (added with db:push), but no earlier migration created.
-- Every statement is skipped when the object exists.
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_name_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_billing_address_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_shipping_address_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_state_code_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_phone_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_email_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_pan_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "party_gstin_snapshot" text;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_name_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_billing_address_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_shipping_address_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_state_code_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_phone_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_email_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_pan_snapshot" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "party_gstin_snapshot" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "audit_events_company_created_idx" ON "audit_events" ("company_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "company_memberships_user_idx" ON "company_memberships" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_debit_notes_company_date_idx" ON "credit_debit_notes" ("company_id","note_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "credit_debit_notes_company_party_idx" ON "credit_debit_notes" ("company_id","party_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "e_invoices_company_idx" ON "e_invoices" ("company_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "expenses_company_date_idx" ON "expenses" ("company_id","expense_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_entries_company_date_idx" ON "ledger_entries" ("company_id","entry_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_lines_account_idx" ON "ledger_lines" ("ledger_account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ledger_lines_company_entry_idx" ON "ledger_lines" ("company_id","entry_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ocr_drafts_company_status_idx" ON "ocr_drafts" ("company_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_allocations_company_document_idx" ON "payment_allocations" ("company_id","document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payment_allocations_company_voucher_idx" ON "payment_allocations" ("company_id","voucher_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_bill_lines_bill_idx" ON "purchase_bill_lines" ("purchase_bill_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_bills_company_date_idx" ON "purchase_bills" ("company_id","bill_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_bills_company_supplier_idx" ON "purchase_bills" ("company_id","supplier_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_grn_lines_grn_idx" ON "purchase_grn_lines" ("purchase_grn_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "purchase_order_lines_order_idx" ON "purchase_order_lines" ("purchase_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_document_lines_doc_idx" ON "sales_document_lines" ("sales_document_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_invoice_lines_invoice_idx" ON "sales_invoice_lines" ("sales_invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_invoices_company_customer_idx" ON "sales_invoices" ("company_id","customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sales_invoices_company_date_idx" ON "sales_invoices" ("company_id","invoice_date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_user_id_idx" ON "session" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "stock_movements_company_item_date_idx" ON "stock_movements" ("company_id","item_id","occurred_on");
