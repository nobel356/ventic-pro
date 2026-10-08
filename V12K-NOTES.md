# Ventic Pro V12K — Launch & Operations Hardening

No Prisma schema change.
No migration.
No dependency.
No new paid service.
No required new environment variable.

## 1. PWA privacy hardening
`public/sw.js` now caches only:
- selected public pages;
- manifest/icons;
- Next static assets.

It never caches:
- `/api/*`
- `/admin/*`
- technician pages
- customer account/review/login/register/reset flows

The cache name changed so old broad V12E cache entries are removed on activation.

## 2. Daily Executive Digest
New:
- `/admin/daily-digest`
- `/api/admin/daily-digest/send`

Super Admin can view the live daily snapshot and email it to their own account.

The digest includes:
- today's appointments;
- new/stale/unassigned orders;
- invoice due amount;
- complaints / maintenance;
- low stock;
- Lead follow-ups;
- failed notifications;
- negative known contribution;
- weak ROAS campaigns;
- unallocated ad spend.

Email sending is intentionally manual/free. There is no scheduler dependency.

## 3. Notification Health Center
New:
`/admin/notification-health`

Super Admin sees:
- 24h send success rate;
- failures for 24h / 7d / 30d;
- channel/status breakdown;
- latest failed notifications;
- masked destination;
- provider;
- safe/redacted failure reason;
- direct order link when available.

## 4. System Health + Launch Readiness
`/admin/system-health` now checks:
- DB connection;
- Prisma migration history health;
- DIRECT_URL;
- private Blob config;
- Resend;
- AUTH_SECRET;
- hardened PWA policy;
- NEXT_PUBLIC_APP_URL;
- custom-domain status;
- support email/phone;
- legal name;
- WhatsApp;
- social links.

No secret values are displayed.

## 5. Mobile admin UX
Admin layout now gives:
- safer table spacing;
- better mobile font sizing;
- touch-friendly controls;
- mobile page padding;
- overflow protection.

## 6. Unified safe diagnostics
New:
`lib/safe-diagnostics.ts`

Used for:
- Blob upload/read/delete;
- customer notifications;
- admin notifications;
- order-status/payment notification events via AdminNotification types;
- marketing spend;
- order direct costs;
- profitability page summaries;
- daily digest sending.

The helper masks:
- email addresses;
- secret/token-like strings;
- six-digit codes.

Do not log OTP, API keys, passwords or full PII.

## 7. Final launch checklist
See:
`LAUNCH-CHECKLIST-V12K.md`

## 8. Domain/email readiness
The code already reads all public identity/support URLs from env.
Once the final domain exists, production work should be configuration only:
- connect domain to Vercel;
- set `NEXT_PUBLIC_APP_URL`;
- verify domain in Resend;
- change `EMAIL_FROM`;
- fill support/legal/social envs.

## Smoke test
1. Open site, then DevTools > Application > Service Workers; verify new cache `ventic-pro-v12k-public-v1`.
2. Login admin and browse private pages; verify they do not appear in Cache Storage.
3. Open `/admin/system-health`.
4. Open `/admin/notification-health`.
5. Open `/admin/daily-digest` and send the digest email.
6. Upload/read an order photo.
7. Change an order status and record a payment.
8. Record/void ad spend and direct order cost.
9. Open profitability.
10. Verify mobile admin pages/tables.
