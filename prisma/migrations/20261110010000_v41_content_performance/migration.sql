CREATE TABLE IF NOT EXISTS "BlogAnalyticsEvent" (
  "id" TEXT NOT NULL,
  "articleSlug" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sessionHash" TEXT NOT NULL,
  "target" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlogAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "BlogAnalyticsEvent_articleSlug_createdAt_idx"
  ON "BlogAnalyticsEvent"("articleSlug", "createdAt");

CREATE INDEX IF NOT EXISTS "BlogAnalyticsEvent_eventType_createdAt_idx"
  ON "BlogAnalyticsEvent"("eventType", "createdAt");

CREATE INDEX IF NOT EXISTS "BlogAnalyticsEvent_sessionHash_createdAt_idx"
  ON "BlogAnalyticsEvent"("sessionHash", "createdAt");
