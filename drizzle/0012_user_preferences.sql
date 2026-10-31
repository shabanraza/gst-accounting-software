-- Opt-in product-update emails. Off unless the user turns it on; the
-- timestamps record when consent was given and withdrawn.
CREATE TABLE IF NOT EXISTS "user_preferences" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "product_updates" boolean DEFAULT false NOT NULL,
  "product_updates_consented_at" timestamp,
  "product_updates_withdrawn_at" timestamp,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
