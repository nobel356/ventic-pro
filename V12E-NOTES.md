# Ventic Pro V12E — Free Launch Pack

This release adds only free/self-hosted capabilities. No new paid service and no Prisma schema migration.

## Added
- PWA install support + service worker + offline fallback.
- App icons for Android/iOS.
- SEO metadata, robots.txt, sitemap.xml, structured data.
- Service landing pages:
  - /services/bathroom-ventilation
  - /services/kitchen-ventilation
  - /services/hood-exhaust
- FAQ page.
- Persistent UTM / campaign attribution cookie.
- Order + Lead acquisition source automatically includes UTM campaign data.
- Super Admin campaign-link builder at /admin/marketing.
- Super Admin system health page at /admin/system-health.
- Resend test-email button from inside the admin panel.
- Safe diagnostics principle remains: never log OTP, API keys, tokens, passwords, or full customer data.

## Free / no-new-cost
Everything in V12E runs inside the existing Next.js/Vercel/Neon/Resend stack and does not add a new paid dependency.

## Recommended Vercel public variables
These are optional but improve production behavior:
- NEXT_PUBLIC_APP_URL=https://ventic-pro-v11-7.vercel.app
- NEXT_PUBLIC_WHATSAPP_NUMBER=2010xxxxxxxx
- NEXT_PUBLIC_FACEBOOK_URL=...
- NEXT_PUBLIC_INSTAGRAM_URL=...
- NEXT_PUBLIC_TIKTOK_URL=...
- NEXT_PUBLIC_YOUTUBE_URL=...
- NEXT_PUBLIC_SUPPORT_EMAIL=...
- NEXT_PUBLIC_SUPPORT_PHONE=...

NEXT_PUBLIC_APP_URL should be changed to the custom domain later when one is purchased.

## Test after deploy
1. Open `/manifest.webmanifest` and `/sitemap.xml`.
2. Open `/services/bathroom-ventilation`.
3. Create a marketing link in `/admin/marketing`.
4. Open that link, create an order, and confirm Acquisition Source contains campaign data.
5. Open `/admin/system-health`.
6. Send a test Resend email.
7. On a supported browser, confirm the install prompt can appear.
