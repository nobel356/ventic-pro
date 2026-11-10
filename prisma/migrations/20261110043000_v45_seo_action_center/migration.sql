CREATE TABLE IF NOT EXISTS "SeoActionState" (
  "id" TEXT NOT NULL,
  "issueKey" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'TODO',
  "ownerLabel" TEXT,
  "note" TEXT,
  "dueAt" TIMESTAMP(3),
  "resolvedAt" TIMESTAMP(3),
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SeoActionState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "SeoActionState_issueKey_key"
  ON "SeoActionState"("issueKey");

CREATE INDEX IF NOT EXISTS "SeoActionState_status_dueAt_idx"
  ON "SeoActionState"("status", "dueAt");
