# V12D.7 — Live homepage reviews

Root cause:
The home page queries Prisma directly but did not opt out of Next.js static rendering.
That can cause the review section to be generated at build time and stay stale after an admin publishes a review.

Fix:
- add `export const dynamic = "force-dynamic";` to `app/page.tsx`
- the homepage now queries published reviews on each request, so newly published reviews appear without a redeploy

No database migration.
