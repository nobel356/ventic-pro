ALTER TABLE "Customer"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByLabel" TEXT,
ADD COLUMN "archiveReason" TEXT,
ADD COLUMN "archiveState" JSONB;

CREATE INDEX "Customer_archivedAt_idx"
ON "Customer"("archivedAt");

ALTER TABLE "Lead"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByLabel" TEXT,
ADD COLUMN "archiveReason" TEXT,
ADD COLUMN "archiveState" JSONB;

CREATE INDEX "Lead_archivedAt_idx"
ON "Lead"("archivedAt");

ALTER TABLE "Supplier"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByLabel" TEXT,
ADD COLUMN "archiveReason" TEXT,
ADD COLUMN "archiveState" JSONB;

CREATE INDEX "Supplier_archivedAt_idx"
ON "Supplier"("archivedAt");

ALTER TABLE "InventoryItem"
ADD COLUMN "archivedAt" TIMESTAMP(3),
ADD COLUMN "archivedById" TEXT,
ADD COLUMN "archivedByLabel" TEXT,
ADD COLUMN "archiveReason" TEXT,
ADD COLUMN "archiveState" JSONB;

CREATE INDEX "InventoryItem_archivedAt_idx"
ON "InventoryItem"("archivedAt");
