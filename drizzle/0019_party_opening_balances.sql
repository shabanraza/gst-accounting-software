CREATE TABLE IF NOT EXISTS "party_opening_balances" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "party_id" uuid NOT NULL REFERENCES "parties"("id"),
  "side" text NOT NULL,
  "as_of_date" text NOT NULL,
  "amount" text NOT NULL,
  "outstanding_amount" text NOT NULL,
  "party_account_id" uuid NOT NULL REFERENCES "ledger_accounts"("id"),
  "ledger_entry_id" uuid NOT NULL REFERENCES "ledger_entries"("id"),
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "party_opening_balances_company_party_idx" ON "party_opening_balances" ("company_id","party_id");
