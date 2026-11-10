CREATE TABLE IF NOT EXISTS "OpsChangeLog" (
  "id" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "severity" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "title" TEXT NOT NULL,
  "detail" TEXT,
  "rootCause" TEXT,
  "resolution" TEXT,
  "relatedSha" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "createdByLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OpsChangeLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "OpsChangeLog_kind_status_occurredAt_idx"
  ON "OpsChangeLog"("kind", "status", "occurredAt");

CREATE INDEX IF NOT EXISTS "OpsChangeLog_severity_status_idx"
  ON "OpsChangeLog"("severity", "status");

INSERT INTO "OpsChangeLog"
("id","kind","severity","status","title","detail","rootCause","resolution","occurredAt","resolvedAt","createdByLabel","createdAt","updatedAt")
VALUES
(
  'ops-v62-restore-drill-20261110',
  'CHANGE',
  'HIGH',
  'RESOLVED',
  'Production restore drill and endpoint recovery',
  'A finalized Neon snapshot restore moved the original production compute endpoint to the historical restored branch during the DR drill.',
  'Neon finalized restore semantics swap/move the endpoint as part of the restore workflow.',
  'The original endpoint was moved back to the current production branch, the current branch was restored as default/primary, production data was re-verified, and live smoke/runtime checks passed.',
  TIMESTAMP '2026-11-10 19:00:00',
  TIMESTAMP '2026-11-10 19:10:00',
  'Ventic Pro V62 seed',
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
