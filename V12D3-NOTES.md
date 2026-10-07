# V12D.3 — Prisma Advisory Lock Fix

The direct Neon connection is now correct. The remaining P1002 is caused by Prisma Migrate's advisory lock.

Prisma documents that:
- migrate resolve/deploy use advisory locking
- the advisory-lock timeout is 10 seconds
- `PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK` can disable this locking

This patch sets that variable only inside `scripts/production-migrate.mjs` for the Prisma migration subprocesses.

Why this is acceptable here:
- the migration is being run from one controlled Vercel production build
- the baseline/bootstrap script already determines the database state before resolving
- no db push, reset, seed, or destructive migration is used

Keep:
- DATABASE_URL = pooled Neon URL for normal app runtime
- DIRECT_URL = direct Neon URL for Prisma migrations

No new Vercel environment variable is required for this fix.

Expected next log:
- Existing database detected...
- Baselining existing schema...
- Baseline recorded successfully.
- Applying migration `20261007090000_customer_email_public_reviews`
- All migrations successfully applied.
