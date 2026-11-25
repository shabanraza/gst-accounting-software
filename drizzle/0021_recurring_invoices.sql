CREATE TABLE IF NOT EXISTS "recurring_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "customer_id" uuid NOT NULL REFERENCES "parties"("id"),
  "customer_name" text NOT NULL,
  "source_invoice_id" uuid NOT NULL REFERENCES "sales_invoices"("id"),
  "frequency" text NOT NULL,
  "start_date" text NOT NULL,
  "next_run_date" text NOT NULL,
  "end_date" text,
  "due_days" integer DEFAULT 0 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "total_amount" text NOT NULL,
  "template" jsonb NOT NULL,
  "last_invoice_id" uuid REFERENCES "sales_invoices"("id"),
  "last_invoice_number" text DEFAULT '' NOT NULL,
  "generated_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "recurring_invoices_company_next_run_idx" ON "recurring_invoices" ("company_id","next_run_date");
