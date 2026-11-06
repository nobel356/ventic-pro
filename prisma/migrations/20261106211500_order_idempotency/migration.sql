-- V20Y-C: durable request idempotency for public order creation.

CREATE TABLE "IdempotencyRequest" (
  "id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "requestHash" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PROCESSING',
  "resourceId" TEXT,
  "response" JSONB,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "IdempotencyRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
  "IdempotencyRequest_scope_key_key"
ON "IdempotencyRequest"("scope", "key");

CREATE INDEX
  "IdempotencyRequest_expiresAt_idx"
ON "IdempotencyRequest"("expiresAt");
