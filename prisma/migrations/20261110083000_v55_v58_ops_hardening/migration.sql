CREATE TABLE IF NOT EXISTS "DisasterRecoveryRecord" (
  "id" TEXT NOT NULL,
  "recordType" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'Neon',
  "providerRef" TEXT,
  "occurredAt" TIMESTAMP(3) NOT NULL,
  "note" TEXT,
  "createdByLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DisasterRecoveryRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DisasterRecoveryRecord_recordType_occurredAt_idx"
  ON "DisasterRecoveryRecord"("recordType", "occurredAt");

INSERT INTO "DisasterRecoveryRecord"
("id","recordType","status","provider","providerRef","occurredAt","note","createdByLabel","createdAt")
VALUES
(
  'dr-v55-backup-20261028',
  'BACKUP',
  'PASS',
  'Neon',
  'snap-winter-hall-b5k616io',
  TIMESTAMP '2026-10-28 22:41:00',
  'Existing manual snapshot verified during production audit. Fresh snapshot creation on 2026-11-10 was blocked by Neon snapshot limit.',
  'Ventic Pro V55 seed',
  CURRENT_TIMESTAMP
),
(
  'dr-v55-restore-20261110',
  'RESTORE_DRILL',
  'PARTIAL_PASS',
  'Neon',
  'restore-drill-20261110',
  TIMESTAMP '2026-11-10 19:00:00',
  'Snapshot restore mechanism verified. Production endpoint recovery verified. Overall DR remains partial until backup freshness is fixed.',
  'Ventic Pro V55 seed',
  CURRENT_TIMESTAMP
)
ON CONFLICT ("id") DO NOTHING;
