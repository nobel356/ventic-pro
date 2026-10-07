ALTER TABLE "Customer"
ADD COLUMN "email" TEXT;

CREATE INDEX "Customer_email_idx"
ON "Customer"("email");

ALTER TABLE "Review"
ADD COLUMN "publicConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "isPublished" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "publishedAt" TIMESTAMP(3);

CREATE INDEX "Review_isPublished_publicConsent_overall_createdAt_idx"
ON "Review"("isPublished","publicConsent","overall","createdAt");
