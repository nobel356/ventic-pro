# Ventic Pro V12A — Security & Database Hardening

V12A is the first launch-hardening stage. It intentionally makes no Prisma schema changes.

## Database deployment safety
The Vercel build command is now:
`prisma generate && next build`

Removed from every automatic deployment:
- `prisma db push`
- automatic `prisma/seed.mjs`

This means a normal code deploy can no longer silently change the production database or reset the owner password.

New manual scripts:
- `npm run db:migrate:dev`
- `npm run db:migrate:deploy`
- `npm run db:migrate:status`
- `npm run db:push:staging-only`
- `npm run db:seed`

Do not use `db:push:staging-only` on the live production database.

The seed is now idempotent for an existing owner: it does not overwrite the existing owner's password.

## Authentication / abuse controls
- Staff login: throttled per IP + login identifier.
- Customer login: throttled per IP + mobile number.
- Customer register: throttled per IP.
- Forgot password and reset password: additional IP throttling on top of the existing OTP cooldown/attempt limit.
- Public order creation and abandoned-order lead capture: throttled.
- Customer sessions are cleaned and capped to avoid unlimited old sessions.

The rate limiter is an application-layer warm-instance safeguard. A distributed edge/WAF limiter can be added later for very high traffic.

## CSRF / request-origin protection
Middleware rejects cross-site mutating API requests and keeps browser cookie actions same-site.

## Security headers
Added:
- HSTS in production
- Content-Security-Policy
- frame-ancestors DENY / X-Frame-Options
- nosniff
- strict referrer policy
- Cross-Origin-Opener-Policy
- Permissions-Policy
- no-store for API responses

## OTP exposure
Completion OTP is no longer exposed in Vercel Production just because messaging is disabled.

A staging OTP appears only when:
- `OTP_STAGING_VISIBLE=true`
- AND the deployment is not `VERCEL_ENV=production`

Password reset staging OTP follows the same production-safe rule.

Important: while the real messaging provider is disabled, production completion OTP cannot be completed using a demo code. Real WhatsApp/SMS is V12B.

## Customer approval links
Quotation / legacy quote / extra-charge links:
- are no-store
- are throttled
- expire after 7 days while still awaiting customer action
- re-check current status inside the transaction before applying the decision
- remain single-response by status

## Financial permissions
Added:
`payments.manage`

Recording payments and manually syncing invoices now require this financial mutation permission.
- SUPER_ADMIN: always allowed.
- ADMIN: included by default.
- Custom roles/users: grant it explicitly if they should record payments.

## Extra charges
The legacy extra-charge endpoint now:
- requires `extra.approve`
- validates the order and amount
- blocks completed/cancelled orders
- writes to the actual AuditLog schema
- uses a 32-byte approval token

## Manual environment check
Run:
`npm run security:check`

Before wide launch it must not report production staging OTP exposure.
Warnings about messaging/storage remain expected until V12B.
