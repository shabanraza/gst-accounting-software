CREATE TABLE IF NOT EXISTS "marketing_submissions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "kind" text NOT NULL,
  "email" text,
  "name" text,
  "phone" text,
  "topic" text,
  "message" text,
  "rating" integer,
  "source_path" text,
  "user_agent" text,
  "ip_hash" text,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "marketing_submissions_waitlist_email_idx" ON "marketing_submissions" ("email") WHERE "kind" = 'waitlist';
CREATE INDEX IF NOT EXISTS "marketing_submissions_ip_created_idx" ON "marketing_submissions" ("ip_hash","created_at");
CREATE INDEX IF NOT EXISTS "marketing_submissions_kind_created_idx" ON "marketing_submissions" ("kind","created_at");
