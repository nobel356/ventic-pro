ALTER TABLE "ArchiveVaultSetting"
ADD COLUMN "resetTokenHash" TEXT,
ADD COLUMN "resetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN "resetRequestedAt" TIMESTAMP(3);
