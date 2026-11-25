ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "barcode" text DEFAULT '' NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "items_company_barcode_idx" ON "items" ("company_id","barcode") WHERE "barcode" <> '';
