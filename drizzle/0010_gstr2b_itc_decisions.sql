CREATE TABLE IF NOT EXISTS "gstr2b_itc_decisions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "period_start" text NOT NULL,
  "period_end" text NOT NULL,
  "row_key" text NOT NULL,
  "status" text NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "gstr2b_itc_decisions_unique_idx" ON "gstr2b_itc_decisions" ("company_id","period_start","period_end","row_key");
CREATE INDEX IF NOT EXISTS "gstr2b_itc_decisions_company_period_idx" ON "gstr2b_itc_decisions" ("company_id","period_start","period_end");
