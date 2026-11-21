-- E-way bills recorded after generating them on the NIC portal, for a sales
-- invoice or a delivery challan. The table has existed since 0009 but was
-- never written to by the app.
ALTER TABLE "e_way_bills" ALTER COLUMN "sales_invoice_id" DROP NOT NULL;
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "sales_document_id" uuid;
ALTER TABLE "e_way_bills" DROP CONSTRAINT IF EXISTS "e_way_bills_sales_document_id_sales_documents_id_fk";
ALTER TABLE "e_way_bills" ADD CONSTRAINT "e_way_bills_sales_document_id_sales_documents_id_fk" FOREIGN KEY ("sales_document_id") REFERENCES "sales_documents"("id");
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "transport_mode" text DEFAULT 'road' NOT NULL;
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "distance_km" integer DEFAULT 0 NOT NULL;
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "transporter_id" text DEFAULT '' NOT NULL;
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "transporter_name" text DEFAULT '' NOT NULL;
ALTER TABLE "e_way_bills" ADD COLUMN IF NOT EXISTS "updated_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "e_way_bills" DROP CONSTRAINT IF EXISTS "e_way_bills_one_source_chk";
ALTER TABLE "e_way_bills" ADD CONSTRAINT "e_way_bills_one_source_chk" CHECK (("sales_invoice_id" IS NULL) <> ("sales_document_id" IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS "e_way_bills_sales_document_idx" ON "e_way_bills" ("sales_document_id");
CREATE INDEX IF NOT EXISTS "e_way_bills_company_idx" ON "e_way_bills" ("company_id");
