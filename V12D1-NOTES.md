# V12D.1 — Prisma Production Baseline Fix

Fixes deployment error P3005 on the existing Neon production database.

Why it happened:
- Production already had tables/data from the earlier db push workflow.
- Prisma Migrate had no migration history table.
- V12D introduced the first real migration, so `prisma migrate deploy` correctly refused to assume ownership of a non-empty schema.

What this patch does:
1. Keeps the V12D additive migration.
2. Adds `prisma/baseline-v12d.prisma`, representing the production schema immediately before V12D.
3. Generates a complete baseline migration during build.
4. Detects the database state:
   - Existing non-empty DB + no Prisma history -> records the baseline as already applied, then deploys V12D.
   - Empty DB -> executes the baseline normally, then V12D.
   - DB with Prisma history -> just deploys pending migrations.
5. Pins Prisma and @prisma/client to 6.19.3 so baseline SQL generation stays deterministic.

No data deletion, db push, reset, or seed is used.

Expected Vercel log on the first successful production build:
- Existing database detected (... public tables) with no Prisma migration history.
- Baselining existing schema as 20261007080000_baseline_existing_schema...
- Baseline recorded successfully.
- 2 migrations found...
- Applying migration `20261007090000_customer_email_public_reviews`
- All migrations have been successfully applied.
