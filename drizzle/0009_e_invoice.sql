CREATE TABLE IF NOT EXISTS "e_invoices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "sales_invoice_id" uuid NOT NULL REFERENCES "sales_invoices"("id"),
  "irn" text NOT NULL,
  "ack_number" text NOT NULL,
  "ack_date" text NOT NULL,
  "qr_code_data" text NOT NULL,
  "generated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "e_invoices_sales_invoice_idx" ON "e_invoices" ("sales_invoice_id");

CREATE TABLE IF NOT EXISTS "e_way_bills" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "company_id" uuid NOT NULL REFERENCES "companies"("id"),
  "sales_invoice_id" uuid NOT NULL REFERENCES "sales_invoices"("id"),
  "ewb_number" text NOT NULL,
  "ewb_date" text NOT NULL,
  "vehicle_number" text,
  "valid_until" text NOT NULL,
  "generated_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "e_way_bills_sales_invoice_idx" ON "e_way_bills" ("sales_invoice_id");
