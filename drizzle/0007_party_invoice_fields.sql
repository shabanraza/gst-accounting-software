ALTER TABLE "companies" ADD COLUMN "invoice_terms" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "address_line1" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "address_line2" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "city" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "pincode" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "contact_phone" text DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "parties" ADD COLUMN "contact_email" text DEFAULT '' NOT NULL;
