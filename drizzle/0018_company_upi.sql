-- Optional UPI ID (VPA) printed as a "scan to pay" QR on sales invoices.
ALTER TABLE "companies" ADD COLUMN IF NOT EXISTS "upi_id" text DEFAULT '' NOT NULL;
