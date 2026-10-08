ALTER TABLE "User"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByLabel" TEXT,
ADD COLUMN "archiveReason" TEXT,
ADD COLUMN "archiveState" JSONB;

CREATE INDEX "User_archivedAt_idx"
ON "User"("archivedAt");

ALTER TABLE "Order"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByLabel" TEXT,
ADD COLUMN "archiveReason" TEXT,
ADD COLUMN "archiveState" JSONB;

CREATE INDEX "Order_archivedAt_idx"
ON "Order"("archivedAt");

CREATE TABLE "ArchiveVaultSetting" (
  "id" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "updatedById" TEXT,
  "updatedByLabel" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ArchiveVaultSetting_pkey"
  PRIMARY KEY ("id")
);
