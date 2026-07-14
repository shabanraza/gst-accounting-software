CREATE TABLE "credit_debit_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"note_type" text NOT NULL,
	"note_number" text NOT NULL,
	"note_date" text NOT NULL,
	"party_id" uuid NOT NULL,
	"reference_document_id" text,
	"taxable_amount" text NOT NULL,
	"total_gst_amount" text NOT NULL,
	"total_amount" text NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "godowns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"price_list_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"rate" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "alias" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "item_group" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "alternate_unit" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "conversion_factor" text DEFAULT '1' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "mrp" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "reorder_level" text DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bill_lines" ADD COLUMN "discount_percent" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bill_lines" ADD COLUMN "discount_amount" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bill_lines" ADD COLUMN "godown_name" text;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "tax_mode" text DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "narration" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "freight" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "packing" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "round_off" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "bill_discount" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "godown_name" text;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD COLUMN "discount_percent" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD COLUMN "discount_amount" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD COLUMN "godown_name" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "tax_mode" text DEFAULT 'exclusive' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "narration" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "freight" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "packing" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "round_off" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "bill_discount" text DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "godown_name" text;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD COLUMN "status" text DEFAULT 'posted' NOT NULL;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD COLUMN "godown_name" text;--> statement-breakpoint
ALTER TABLE "credit_debit_notes" ADD CONSTRAINT "credit_debit_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_debit_notes" ADD CONSTRAINT "credit_debit_notes_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_debit_notes" ADD CONSTRAINT "credit_debit_notes_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "godowns" ADD CONSTRAINT "godowns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "godowns_company_name_idx" ON "godowns" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "price_list_items_list_item_idx" ON "price_list_items" USING btree ("price_list_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_lists_company_name_idx" ON "price_lists" USING btree ("company_id","name");