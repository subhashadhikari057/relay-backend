CREATE EXTENSION IF NOT EXISTS citext;

ALTER TABLE "users"
ALTER COLUMN "email" TYPE CITEXT
USING "email"::citext;

DROP INDEX IF EXISTS "organization_invites_organization_id_email_key";

CREATE INDEX IF NOT EXISTS "organization_invites_organization_id_email_idx"
ON "organization_invites" ("organization_id", "email");

CREATE UNIQUE INDEX IF NOT EXISTS "organization_invites_pending_email_unique"
ON "organization_invites" ("organization_id", "email")
WHERE "accepted_at" IS NULL AND "revoked_at" IS NULL;
