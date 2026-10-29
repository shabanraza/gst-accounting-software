-- When a user answered "No thanks" to the in-app product-updates prompt, so
-- it is not asked again. A "Yes" is recorded as consent instead.
ALTER TABLE "user_preferences" ADD COLUMN IF NOT EXISTS "product_updates_prompted_at" timestamp;
