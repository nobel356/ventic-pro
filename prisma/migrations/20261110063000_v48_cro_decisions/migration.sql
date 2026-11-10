ALTER TABLE "CroExperiment"
  ADD COLUMN IF NOT EXISTS "decision" TEXT,
  ADD COLUMN IF NOT EXISTS "decisionNote" TEXT,
  ADD COLUMN IF NOT EXISTS "decidedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "decidedByLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "previousServiceLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "appliedServiceLabel" TEXT,
  ADD COLUMN IF NOT EXISTS "rolledOutAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "rolledBackAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "CroExperiment_status_decidedAt_idx"
  ON "CroExperiment"("status", "decidedAt");
