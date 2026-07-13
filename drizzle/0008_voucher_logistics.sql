ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "due_date" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "po_reference" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "transport_mode" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "vehicle_no" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "lr_number" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN IF NOT EXISTS "challan_ref" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "po_reference" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "transport_mode" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "vehicle_no" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "lr_number" text NOT NULL DEFAULT '';
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN IF NOT EXISTS "challan_ref" text NOT NULL DEFAULT '';
