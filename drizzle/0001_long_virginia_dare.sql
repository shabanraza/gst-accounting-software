CREATE TABLE "dashboard_daily_summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"summary_date" text NOT NULL,
	"sales_total" text NOT NULL,
	"purchase_total" text NOT NULL,
	"receivable_total" text NOT NULL,
	"payable_total" text NOT NULL,
	"stock_in_quantity" text NOT NULL,
	"stock_out_quantity" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "payment_status" text DEFAULT 'Pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD COLUMN "outstanding_amount" text NOT NULL;--> statement-breakpoint
ALTER TABLE "dashboard_daily_summaries" ADD CONSTRAINT "dashboard_daily_summaries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_daily_summaries_company_date_idx" ON "dashboard_daily_summaries" USING btree ("company_id","summary_date");