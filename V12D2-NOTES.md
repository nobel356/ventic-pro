# V12D.2 — Neon Direct Connection for Prisma Migrations

This fixes Prisma P1002 advisory-lock timeout during `migrate resolve/deploy`.

Reason:
- `DATABASE_URL` currently points to Neon's pooled endpoint (`-pooler`).
- Application runtime traffic should keep using that pooled URL.
- Prisma migration/admin commands need a direct PostgreSQL connection.
- Prisma ORM 6.19 supports this via `directUrl` in `schema.prisma`.

Before pushing this patch, add this Vercel Production environment variable:

DIRECT_URL=<Neon direct connection string>

Get it from Neon:
1. Neon dashboard -> your project.
2. Click Connect.
3. Select the same branch: production/default.
4. Database: neondb.
5. Role: neondb_owner.
6. Turn OFF / disable Connection pooling.
7. Copy the connection string.
8. Add it in Vercel as `DIRECT_URL` for Production.

Important:
- The DIRECT_URL host must NOT contain `-pooler`.
- Keep the existing DATABASE_URL exactly as it is; it remains pooled for the app.
- Do not paste either URL into chat.

Expected first successful deployment:
- Existing database detected...
- Baselining existing schema...
- Baseline recorded successfully.
- Applying migration `20261007090000_customer_email_public_reviews`
- All migrations successfully applied.
- Next.js build continues.

No database reset, db push, seed, or data deletion is used.
