CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" text NOT NULL,
	"legal_name" text NOT NULL,
	"trade_name" text NOT NULL,
	"gstin" text,
	"state_code" text NOT NULL,
	"financial_year_start" text NOT NULL,
	"business_type" text NOT NULL,
	"address_line1" text DEFAULT '' NOT NULL,
	"address_line2" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"pincode" text DEFAULT '' NOT NULL,
	"pan" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"bank_name" text DEFAULT '' NOT NULL,
	"bank_account_number" text DEFAULT '' NOT NULL,
	"bank_ifsc" text DEFAULT '' NOT NULL,
	"authorized_signatory" text DEFAULT '' NOT NULL,
	"logo_url" text DEFAULT '' NOT NULL,
	"invoice_terms" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "company_invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"email" text NOT NULL,
	"role" text NOT NULL,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"invited_by_user_id" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"accepted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "company_memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "document_attachments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"linked_document_type" text NOT NULL,
	"linked_document_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"original_filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_sequences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"financial_year_id" uuid NOT NULL,
	"voucher_type" text NOT NULL,
	"series" text NOT NULL,
	"next_number" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"irn" text NOT NULL,
	"ack_number" text NOT NULL,
	"ack_date" text NOT NULL,
	"qr_code_data" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "e_way_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"ewb_number" text NOT NULL,
	"ewb_date" text NOT NULL,
	"vehicle_number" text,
	"valid_until" text NOT NULL,
	"generated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"expense_date" text NOT NULL,
	"narration" text NOT NULL,
	"amount" text NOT NULL,
	"expense_account_id" uuid NOT NULL,
	"payment_account_id" uuid NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "financial_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"start_date" text NOT NULL,
	"end_date" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
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
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"alias" text DEFAULT '' NOT NULL,
	"item_group" text DEFAULT '' NOT NULL,
	"hsn_code" text NOT NULL,
	"gst_rate" text NOT NULL,
	"base_unit" text NOT NULL,
	"alternate_unit" text DEFAULT '' NOT NULL,
	"conversion_factor" text DEFAULT '1' NOT NULL,
	"mrp" text DEFAULT '0.00' NOT NULL,
	"reorder_level" text DEFAULT '0' NOT NULL,
	"purchase_rate" text NOT NULL,
	"sale_rate" text NOT NULL,
	"tracks_inventory" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"account_type" text NOT NULL,
	"system_key" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"entry_date" text NOT NULL,
	"narration" text NOT NULL,
	"voucher_type" text NOT NULL,
	"total_debit" text NOT NULL,
	"total_credit" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ledger_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"ledger_account_id" uuid NOT NULL,
	"debit" text NOT NULL,
	"credit" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocr_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"attachment_id" uuid NOT NULL,
	"status" text NOT NULL,
	"fields_json" text NOT NULL,
	"low_confidence_fields_json" text NOT NULL,
	"posted_purchase_bill_id" uuid,
	"reviewed_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" text NOT NULL,
	"party_type" text NOT NULL,
	"gstin" text,
	"pan" text DEFAULT '' NOT NULL,
	"state_code" text NOT NULL,
	"address_line1" text DEFAULT '' NOT NULL,
	"address_line2" text DEFAULT '' NOT NULL,
	"city" text DEFAULT '' NOT NULL,
	"pincode" text DEFAULT '' NOT NULL,
	"contact_phone" text DEFAULT '' NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"billing_address" text DEFAULT '' NOT NULL,
	"shipping_address" text DEFAULT '' NOT NULL,
	"credit_limit" text,
	"payment_terms_days" integer NOT NULL,
	"price_list_id" uuid,
	"receivable_account_id" uuid,
	"payable_account_id" uuid,
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
CREATE TABLE "purchase_bill_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_bill_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"rate" text NOT NULL,
	"gst_rate" text NOT NULL,
	"discount_percent" text DEFAULT '0.00' NOT NULL,
	"discount_amount" text DEFAULT '0.00' NOT NULL,
	"godown_name" text,
	"taxable_amount" text NOT NULL,
	"gst_amount" text NOT NULL,
	"line_total" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"financial_year_start" text NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_bill_number" text NOT NULL,
	"bill_date" text NOT NULL,
	"due_date" text NOT NULL,
	"po_reference" text DEFAULT '' NOT NULL,
	"transport_mode" text DEFAULT '' NOT NULL,
	"vehicle_no" text DEFAULT '' NOT NULL,
	"lr_number" text DEFAULT '' NOT NULL,
	"challan_ref" text DEFAULT '' NOT NULL,
	"place_of_supply" text DEFAULT '' NOT NULL,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"party_name_snapshot" text DEFAULT '' NOT NULL,
	"party_gstin_snapshot" text,
	"party_pan_snapshot" text DEFAULT '' NOT NULL,
	"party_billing_address_snapshot" text DEFAULT '' NOT NULL,
	"party_shipping_address_snapshot" text DEFAULT '' NOT NULL,
	"party_state_code_snapshot" text DEFAULT '' NOT NULL,
	"party_phone_snapshot" text DEFAULT '' NOT NULL,
	"party_email_snapshot" text DEFAULT '' NOT NULL,
	"payment_status" text DEFAULT 'Pending' NOT NULL,
	"tax_mode" text DEFAULT 'exclusive' NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"freight" text DEFAULT '0.00' NOT NULL,
	"packing" text DEFAULT '0.00' NOT NULL,
	"round_off" text DEFAULT '0.00' NOT NULL,
	"bill_discount" text DEFAULT '0.00' NOT NULL,
	"godown_name" text,
	"taxable_amount" text NOT NULL,
	"total_gst_amount" text NOT NULL,
	"total_amount" text NOT NULL,
	"outstanding_amount" text NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
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
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"rate" text NOT NULL,
	"gst_rate" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"order_number" text NOT NULL,
	"order_date" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"total_amount" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_document_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_document_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"rate" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"document_type" text NOT NULL,
	"document_number" text NOT NULL,
	"document_date" text NOT NULL,
	"customer_id" uuid NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"total_amount" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"converted_to_invoice_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoice_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_invoice_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"rate" text NOT NULL,
	"gst_rate" text NOT NULL,
	"discount_percent" text DEFAULT '0.00' NOT NULL,
	"discount_amount" text DEFAULT '0.00' NOT NULL,
	"godown_name" text,
	"taxable_amount" text NOT NULL,
	"gst_amount" text NOT NULL,
	"line_total" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_number" text NOT NULL,
	"invoice_date" text NOT NULL,
	"due_date" text DEFAULT '' NOT NULL,
	"po_reference" text DEFAULT '' NOT NULL,
	"transport_mode" text DEFAULT '' NOT NULL,
	"vehicle_no" text DEFAULT '' NOT NULL,
	"lr_number" text DEFAULT '' NOT NULL,
	"challan_ref" text DEFAULT '' NOT NULL,
	"place_of_supply" text DEFAULT '' NOT NULL,
	"reverse_charge" boolean DEFAULT false NOT NULL,
	"party_name_snapshot" text DEFAULT '' NOT NULL,
	"party_gstin_snapshot" text,
	"party_pan_snapshot" text DEFAULT '' NOT NULL,
	"party_billing_address_snapshot" text DEFAULT '' NOT NULL,
	"party_shipping_address_snapshot" text DEFAULT '' NOT NULL,
	"party_state_code_snapshot" text DEFAULT '' NOT NULL,
	"party_phone_snapshot" text DEFAULT '' NOT NULL,
	"party_email_snapshot" text DEFAULT '' NOT NULL,
	"payment_mode" text NOT NULL,
	"payment_status" text NOT NULL,
	"tax_mode" text DEFAULT 'exclusive' NOT NULL,
	"narration" text DEFAULT '' NOT NULL,
	"freight" text DEFAULT '0.00' NOT NULL,
	"packing" text DEFAULT '0.00' NOT NULL,
	"round_off" text DEFAULT '0.00' NOT NULL,
	"bill_discount" text DEFAULT '0.00' NOT NULL,
	"godown_name" text,
	"status" text DEFAULT 'posted' NOT NULL,
	"taxable_amount" text NOT NULL,
	"total_gst_amount" text NOT NULL,
	"total_amount" text NOT NULL,
	"outstanding_amount" text NOT NULL,
	"ledger_entry_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "stock_balances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"godown_name" text,
	"movement_type" text NOT NULL,
	"direction" text NOT NULL,
	"quantity" text NOT NULL,
	"unit" text NOT NULL,
	"reference_type" text NOT NULL,
	"reference_id" text NOT NULL,
	"occurred_on" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "todos" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invitations" ADD CONSTRAINT "company_invitations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_memberships" ADD CONSTRAINT "company_memberships_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_debit_notes" ADD CONSTRAINT "credit_debit_notes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_debit_notes" ADD CONSTRAINT "credit_debit_notes_party_id_parties_id_fk" FOREIGN KEY ("party_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_debit_notes" ADD CONSTRAINT "credit_debit_notes_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_daily_summaries" ADD CONSTRAINT "dashboard_daily_summaries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_attachments" ADD CONSTRAINT "document_attachments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_sequences" ADD CONSTRAINT "document_sequences_financial_year_id_financial_years_id_fk" FOREIGN KEY ("financial_year_id") REFERENCES "public"."financial_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e_invoices" ADD CONSTRAINT "e_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e_invoices" ADD CONSTRAINT "e_invoices_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e_way_bills" ADD CONSTRAINT "e_way_bills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "e_way_bills" ADD CONSTRAINT "e_way_bills_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_expense_account_id_ledger_accounts_id_fk" FOREIGN KEY ("expense_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_payment_account_id_ledger_accounts_id_fk" FOREIGN KEY ("payment_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "financial_years" ADD CONSTRAINT "financial_years_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "godowns" ADD CONSTRAINT "godowns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_accounts" ADD CONSTRAINT "ledger_accounts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_entry_id_ledger_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_lines" ADD CONSTRAINT "ledger_lines_ledger_account_id_ledger_accounts_id_fk" FOREIGN KEY ("ledger_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_drafts" ADD CONSTRAINT "ocr_drafts_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ocr_drafts" ADD CONSTRAINT "ocr_drafts_attachment_id_document_attachments_id_fk" FOREIGN KEY ("attachment_id") REFERENCES "public"."document_attachments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_receivable_account_id_ledger_accounts_id_fk" FOREIGN KEY ("receivable_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parties" ADD CONSTRAINT "parties_payable_account_id_ledger_accounts_id_fk" FOREIGN KEY ("payable_account_id") REFERENCES "public"."ledger_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_price_list_id_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."price_lists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_list_items" ADD CONSTRAINT "price_list_items_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_lists" ADD CONSTRAINT "price_lists_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "purchase_bill_lines_purchase_bill_id_purchase_bills_id_fk" FOREIGN KEY ("purchase_bill_id") REFERENCES "public"."purchase_bills"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bill_lines" ADD CONSTRAINT "purchase_bill_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_supplier_id_parties_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_bills" ADD CONSTRAINT "purchase_bills_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grn_lines" ADD CONSTRAINT "purchase_grn_lines_purchase_grn_id_purchase_grns_id_fk" FOREIGN KEY ("purchase_grn_id") REFERENCES "public"."purchase_grns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grn_lines" ADD CONSTRAINT "purchase_grn_lines_purchase_order_line_id_purchase_order_lines_id_fk" FOREIGN KEY ("purchase_order_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grn_lines" ADD CONSTRAINT "purchase_grn_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_grns" ADD CONSTRAINT "purchase_grns_supplier_id_parties_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_parties_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_document_lines" ADD CONSTRAINT "sales_document_lines_sales_document_id_sales_documents_id_fk" FOREIGN KEY ("sales_document_id") REFERENCES "public"."sales_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_document_lines" ADD CONSTRAINT "sales_document_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_customer_id_parties_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_sales_invoice_id_sales_invoices_id_fk" FOREIGN KEY ("sales_invoice_id") REFERENCES "public"."sales_invoices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoice_lines" ADD CONSTRAINT "sales_invoice_lines_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_customer_id_parties_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."parties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_invoices" ADD CONSTRAINT "sales_invoices_ledger_entry_id_ledger_entries_id_fk" FOREIGN KEY ("ledger_entry_id") REFERENCES "public"."ledger_entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_balances" ADD CONSTRAINT "stock_balances_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_item_id_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_events_company_created_idx" ON "audit_events" USING btree ("company_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "companies_account_gstin_idx" ON "companies" USING btree ("account_id","gstin");--> statement-breakpoint
CREATE UNIQUE INDEX "company_invitations_company_email_idx" ON "company_invitations" USING btree ("company_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "company_memberships_company_user_idx" ON "company_memberships" USING btree ("company_id","user_id");--> statement-breakpoint
CREATE INDEX "company_memberships_user_idx" ON "company_memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "credit_debit_notes_company_date_idx" ON "credit_debit_notes" USING btree ("company_id","note_date");--> statement-breakpoint
CREATE INDEX "credit_debit_notes_company_party_idx" ON "credit_debit_notes" USING btree ("company_id","party_id");--> statement-breakpoint
CREATE UNIQUE INDEX "dashboard_daily_summaries_company_date_idx" ON "dashboard_daily_summaries" USING btree ("company_id","summary_date");--> statement-breakpoint
CREATE UNIQUE INDEX "document_sequences_scope_idx" ON "document_sequences" USING btree ("company_id","financial_year_id","voucher_type","series");--> statement-breakpoint
CREATE UNIQUE INDEX "e_invoices_sales_invoice_idx" ON "e_invoices" USING btree ("sales_invoice_id");--> statement-breakpoint
CREATE INDEX "e_invoices_company_idx" ON "e_invoices" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "e_way_bills_sales_invoice_idx" ON "e_way_bills" USING btree ("sales_invoice_id");--> statement-breakpoint
CREATE INDEX "e_way_bills_company_idx" ON "e_way_bills" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "expenses_company_date_idx" ON "expenses" USING btree ("company_id","expense_date");--> statement-breakpoint
CREATE UNIQUE INDEX "financial_years_company_start_idx" ON "financial_years" USING btree ("company_id","start_date");--> statement-breakpoint
CREATE UNIQUE INDEX "godowns_company_name_idx" ON "godowns" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "items_company_name_idx" ON "items" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_company_code_idx" ON "ledger_accounts" USING btree ("company_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_accounts_company_system_key_idx" ON "ledger_accounts" USING btree ("company_id","system_key");--> statement-breakpoint
CREATE INDEX "ledger_entries_company_date_idx" ON "ledger_entries" USING btree ("company_id","entry_date");--> statement-breakpoint
CREATE INDEX "ledger_lines_company_entry_idx" ON "ledger_lines" USING btree ("company_id","entry_id");--> statement-breakpoint
CREATE INDEX "ledger_lines_account_idx" ON "ledger_lines" USING btree ("ledger_account_id");--> statement-breakpoint
CREATE INDEX "ocr_drafts_company_status_idx" ON "ocr_drafts" USING btree ("company_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "parties_company_name_idx" ON "parties" USING btree ("company_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "price_list_items_list_item_idx" ON "price_list_items" USING btree ("price_list_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "price_lists_company_name_idx" ON "price_lists" USING btree ("company_id","name");--> statement-breakpoint
CREATE INDEX "purchase_bill_lines_bill_idx" ON "purchase_bill_lines" USING btree ("purchase_bill_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_bills_supplier_number_fy_idx" ON "purchase_bills" USING btree ("company_id","supplier_id","supplier_bill_number","financial_year_start");--> statement-breakpoint
CREATE INDEX "purchase_bills_company_date_idx" ON "purchase_bills" USING btree ("company_id","bill_date");--> statement-breakpoint
CREATE INDEX "purchase_bills_company_supplier_idx" ON "purchase_bills" USING btree ("company_id","supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_grn_lines_grn_idx" ON "purchase_grn_lines" USING btree ("purchase_grn_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_grns_company_number_idx" ON "purchase_grns" USING btree ("company_id","grn_number");--> statement-breakpoint
CREATE INDEX "purchase_order_lines_order_idx" ON "purchase_order_lines" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_company_number_idx" ON "purchase_orders" USING btree ("company_id","order_number");--> statement-breakpoint
CREATE INDEX "sales_document_lines_doc_idx" ON "sales_document_lines" USING btree ("sales_document_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_documents_company_number_idx" ON "sales_documents" USING btree ("company_id","document_number");--> statement-breakpoint
CREATE INDEX "sales_invoice_lines_invoice_idx" ON "sales_invoice_lines" USING btree ("sales_invoice_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_invoices_company_number_idx" ON "sales_invoices" USING btree ("company_id","invoice_number");--> statement-breakpoint
CREATE INDEX "sales_invoices_company_date_idx" ON "sales_invoices" USING btree ("company_id","invoice_date");--> statement-breakpoint
CREATE INDEX "sales_invoices_company_customer_idx" ON "sales_invoices" USING btree ("company_id","customer_id");--> statement-breakpoint
CREATE INDEX "session_user_id_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_balances_company_item_idx" ON "stock_balances" USING btree ("company_id","item_id");--> statement-breakpoint
CREATE INDEX "stock_movements_company_item_date_idx" ON "stock_movements" USING btree ("company_id","item_id","occurred_on");