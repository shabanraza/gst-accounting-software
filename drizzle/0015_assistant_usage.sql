CREATE TABLE IF NOT EXISTS "assistant_usage" (
  "company_id" uuid NOT NULL REFERENCES "companies"("id") ON DELETE CASCADE,
  "usage_date" text NOT NULL,
  "question_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "assistant_usage_company_id_usage_date_pk" PRIMARY KEY ("company_id", "usage_date")
);
