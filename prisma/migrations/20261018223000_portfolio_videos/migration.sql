CREATE TABLE "PortfolioVideo" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "caption" TEXT,
    "location" TEXT,
    "serviceType" TEXT,
    "blobUrl" TEXT NOT NULL,
    "blobPathname" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "customerConsent" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMP(3),
    "createdByLabel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioVideo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PortfolioVideo_blobPathname_key"
ON "PortfolioVideo"("blobPathname");

CREATE INDEX "PortfolioVideo_publish_order_idx"
ON "PortfolioVideo"("isPublished", "sortOrder", "createdAt");
