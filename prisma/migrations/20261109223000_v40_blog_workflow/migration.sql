ALTER TABLE "BlogArticle"
  ADD COLUMN IF NOT EXISTS "visualStoragePath" TEXT,
  ADD COLUMN IF NOT EXISTS "scheduledAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "BlogArticle_status_scheduledAt_idx"
  ON "BlogArticle"("status", "scheduledAt");

CREATE TABLE IF NOT EXISTS "BlogArticleRevision" (
  "id" TEXT NOT NULL,
  "articleId" TEXT NOT NULL,
  "snapshot" JSONB NOT NULL,
  "createdByLabel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogArticleRevision_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BlogArticleRevision_articleId_createdAt_idx"
  ON "BlogArticleRevision"("articleId", "createdAt");
