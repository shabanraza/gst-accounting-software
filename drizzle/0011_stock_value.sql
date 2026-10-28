-- Moving weighted-average stock value. NULL marks rows written before values
-- were tracked; scripts/repair-stock-value.ts fills them in.
ALTER TABLE "stock_balances" ADD COLUMN IF NOT EXISTS "value" text;
ALTER TABLE "stock_movements" ADD COLUMN IF NOT EXISTS "value" text;
