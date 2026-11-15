ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "taxable_amount" text;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "gst_rate" text DEFAULT '0.00' NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "gst_amount" text DEFAULT '0.00' NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "itc_claimed" boolean DEFAULT false NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "supplier_name" text DEFAULT '' NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "supplier_gstin" text DEFAULT '' NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "bill_number" text DEFAULT '' NOT NULL;
ALTER TABLE "expenses" ADD COLUMN IF NOT EXISTS "place_of_supply" text DEFAULT '' NOT NULL;
