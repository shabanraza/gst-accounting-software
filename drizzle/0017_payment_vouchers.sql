CREATE TABLE IF NOT EXISTS "payment_vouchers" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "voucher_number" text NOT NULL,
  "kind" text NOT NULL,
  "party_id" uuid NOT NULL REFERENCES "parties"("id"),
  "voucher_date" text NOT NULL,
  "mode" text NOT NULL,
  "cash_bank_account_id" uuid NOT NULL REFERENCES "ledger_accounts"("id"),
  "party_account_id" uuid NOT NULL REFERENCES "ledger_accounts"("id"),
  "reference" text DEFAULT '' NOT NULL,
  "amount" text NOT NULL,
  "unallocated_amount" text NOT NULL,
  "narration" text DEFAULT '' NOT NULL,
  "status" text DEFAULT 'posted' NOT NULL,
  "ledger_entry_id" uuid NOT NULL REFERENCES "ledger_entries"("id"),
  "cancel_ledger_entry_id" uuid REFERENCES "ledger_entries"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "payment_vouchers_company_number_idx" ON "payment_vouchers" ("company_id","voucher_number");
CREATE INDEX IF NOT EXISTS "payment_vouchers_company_date_idx" ON "payment_vouchers" ("company_id","voucher_date");
CREATE INDEX IF NOT EXISTS "payment_vouchers_company_party_idx" ON "payment_vouchers" ("company_id","party_id");
CREATE TABLE IF NOT EXISTS "payment_allocations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "voucher_id" uuid NOT NULL REFERENCES "payment_vouchers"("id"),
  "document_type" text NOT NULL,
  "document_id" uuid NOT NULL,
  "document_number" text NOT NULL,
  "amount" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "payment_allocations_company_voucher_idx" ON "payment_allocations" ("company_id","voucher_id");
CREATE INDEX IF NOT EXISTS "payment_allocations_company_document_idx" ON "payment_allocations" ("company_id","document_id");
