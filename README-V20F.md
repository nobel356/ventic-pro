# Ventic Pro V20F — SEO + Homepage Performance Hotfix

## What this changes

1. Adds an explicit canonical URL for the homepage:
   https://ventic-pro.com/

2. Replaces `force-dynamic` on the homepage with 5-minute ISR caching:
   `export const revalidate = 300;`

This allows Vercel/Next.js to cache the public homepage instead of querying the
database on every page view, while published reviews can still refresh regularly.

## How to apply

1. Extract this ZIP directly into the Ventic Pro repository root.
2. Double-click `APPLY-V20F.cmd`.
3. Open GitHub Desktop and confirm only `app/page.tsx` changed.
4. Commit and push with:

V20F - optimize homepage SEO and caching

## No changes to

- Database schema
- Prisma migrations
- Environment variables
- Order flow
- Lead Recovery
- Resend/email
- GTM/GA4/Clarity
- DNS/domain

## Rollback

Revert the V20F commit in GitHub Desktop.
