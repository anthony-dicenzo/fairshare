CREATE TABLE IF NOT EXISTS "group_invites" (
  "id" SERIAL PRIMARY KEY,
  "group_id" INTEGER NOT NULL REFERENCES "groups"("id"),
  "invite_code" TEXT NOT NULL UNIQUE,
  "created_by" INTEGER NOT NULL REFERENCES "users"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "expires_at" TIMESTAMP,
  "is_active" BOOLEAN NOT NULL DEFAULT true
);
