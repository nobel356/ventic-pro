CREATE TABLE IF NOT EXISTS "GrowthTarget" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "targetValue" DOUBLE PRECISION NOT NULL,
  "comparator" TEXT NOT NULL DEFAULT 'GTE',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "updatedByLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthTarget_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GrowthTarget_key_key"
  ON "GrowthTarget"("key");

CREATE TABLE IF NOT EXISTS "GrowthReview" (
  "id" TEXT NOT NULL,
  "weekStart" TIMESTAMP(3) NOT NULL,
  "snapshot" JSONB NOT NULL,
  "notes" TEXT,
  "decisions" TEXT,
  "createdByLabel" TEXT,
  "refreshedAt" TIMESTAMP(3),
  "refreshedByLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "GrowthReview_weekStart_key"
  ON "GrowthReview"("weekStart");

CREATE TABLE IF NOT EXISTS "GrowthCommitment" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
  "sourceKey" TEXT,
  "ownerLabel" TEXT,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "note" TEXT,
  "createdByLabel" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrowthCommitment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "GrowthCommitment_status_dueAt_idx"
  ON "GrowthCommitment"("status", "dueAt");
