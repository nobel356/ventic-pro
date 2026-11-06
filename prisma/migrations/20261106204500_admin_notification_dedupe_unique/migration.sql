-- V20Y-B: make admin notification dedupe concurrency-safe.

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "recipientId", "dedupeKey"
      ORDER BY "createdAt" ASC, "id" ASC
    ) AS rn
  FROM "AdminNotification"
  WHERE "dedupeKey" IS NOT NULL
)
DELETE FROM "AdminNotification" AS target
USING ranked
WHERE target."id" = ranked."id"
  AND ranked.rn > 1;

DROP INDEX IF EXISTS "AdminNotification_recipientId_dedupeKey_idx";

CREATE UNIQUE INDEX
  "AdminNotification_recipientId_dedupeKey_key"
ON "AdminNotification"("recipientId", "dedupeKey");
