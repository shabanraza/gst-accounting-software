ALTER TABLE "parties" ADD COLUMN "price_list_id" uuid;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD COLUMN "status" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD COLUMN "converted_to_invoice_id" uuid;--> statement-breakpoint
CREATE TABLE "purchase_grns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"supplier_id" uuid NOT NULL,
	"grn_number" text NOT NULL,
	"grn_date" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"converted_to_bill_id" uuid,
	"narration" text DEFAULT '' NOT NULL,
	"godown_name" text,
	"total_amount" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_grn_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_grn_id" uuid NOT NULL,
	"purchase_order_line_id" uuid,
	"item_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"rate" text NOT NULL,
	"gst_rate" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_supplier_id_parties_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grn_lines" ADD CONSTRAINT "purchase_grn_lines_purchase_grn_id_purchase_grns_id_fk" FOREIGN KEY ("purchase_grn_id") REFERENCES "public"."purchase_grns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grn_lines" ADD CONSTRAINT "purchase_grn_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grn_lines" ADD CONSTRAINT "purchase_grn_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_grns_company_number_idx" ON "purchase_grns" USING btree ("company_id","grn_number");
