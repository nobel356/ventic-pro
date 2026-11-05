# Ventic Pro V20H — Security Lockdown

V20H closes the four high-risk API findings identified after V20G2.

## Fixed

- `/api/admin/orders` now requires `ORDERS_VIEW`.
- The orders list no longer serializes the full Customer record, so `passwordHash` cannot leak through `customer: true`.
- Customer phone/address are masked unless the signed-in staff account has `CUSTOMER_SENSITIVE`.
- `/api/admin/pricing` now requires `PRICE_EDIT` for both read and write operations.
- Pricing writes validate inputs and create Audit Log entries.
- Legacy unauthenticated endpoints `/api/maintenance` and `/api/complaints` are removed.
- The supported customer route remains `/api/customer/aftercare`, which verifies the customer session and order ownership.
- A build-time regression guard scans every `app/api/admin/**/route.ts` and fails the build if a route has no recognized auth guard.
- The regression guard also fails if either legacy endpoint is reintroduced.

## Build protection

The normal `npm run build` now runs the route guard before Prisma generation/migrations/Next.js build.

## Verification already completed

V20H was tested against commit:

`02d6a9afd383e3cabda3672d7d335d42bc7df15e` — `V20G2 - fix social preview images`

Checks completed successfully:

- Regression scan: 52 Admin API routes passed.
- Negative regression test: an intentionally unprotected Admin route was correctly rejected.
- `prisma generate`: passed.
- `npx tsc --noEmit`: passed with 0 TypeScript errors.
- `git diff --check`: passed.

## Apply

1. Extract this ZIP into the Ventic Pro repository root.
2. Double-click `APPLY-V20H.cmd`.
3. Confirm the script reports `V20H APPLIED SUCCESSFULLY`.
4. Commit and push:

`V20H - security lockdown`

Vercel will then deploy the secured version from `main`.
