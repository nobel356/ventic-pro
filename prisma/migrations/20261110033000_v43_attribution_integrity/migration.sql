ALTER TABLE "Order"
  ADD COLUMN IF NOT EXISTS "attributionSource" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionMedium" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionContent" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionTerm" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionRef" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionLanding" TEXT;

ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "attributionSource" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionMedium" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionCampaign" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionContent" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionTerm" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionRef" TEXT,
  ADD COLUMN IF NOT EXISTS "attributionLanding" TEXT;

CREATE INDEX IF NOT EXISTS "Order_attributionSource_createdAt_idx"
  ON "Order"("attributionSource", "createdAt");

CREATE INDEX IF NOT EXISTS "Order_attributionCampaign_createdAt_idx"
  ON "Order"("attributionCampaign", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_attributionSource_createdAt_idx"
  ON "Lead"("attributionSource", "createdAt");

CREATE INDEX IF NOT EXISTS "Lead_attributionCampaign_createdAt_idx"
  ON "Lead"("attributionCampaign", "createdAt");
