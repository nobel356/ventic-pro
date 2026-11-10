CREATE TABLE IF NOT EXISTS "CroExperiment" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "articleSlug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "controlLabel" TEXT NOT NULL,
  "variantLabel" TEXT NOT NULL,
  "createdByLabel" TEXT,
  "startedAt" TIMESTAMP(3),
  "endsAt" TIMESTAMP(3),
  "stoppedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CroExperiment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CroEvent" (
  "id" TEXT NOT NULL,
  "experimentId" TEXT NOT NULL,
  "variant" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CroEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CroExperiment_articleSlug_status_idx"
  ON "CroExperiment"("articleSlug", "status");

CREATE INDEX IF NOT EXISTS "CroEvent_experimentId_variant_eventType_idx"
  ON "CroEvent"("experimentId", "variant", "eventType");

CREATE UNIQUE INDEX IF NOT EXISTS "CroEvent_experimentId_variant_eventType_sessionHash_key"
  ON "CroEvent"("experimentId", "variant", "eventType", "sessionHash");
