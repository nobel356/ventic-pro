-- V20Y-D: upload retry dedupe and attachment integrity.

ALTER TABLE "Attachment"
ADD COLUMN "uploadKey" TEXT;

CREATE UNIQUE INDEX
  "Attachment_orderId_uploadKey_key"
ON "Attachment"("orderId", "uploadKey");
