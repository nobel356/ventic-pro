# Ventic Pro V20C — GTM Preview Hotfix

Fixes Google Tag Assistant preview/debug connection.

## What changed

1. GTM now boots from the initial HTML <head> using the standard Google Tag Manager pattern.
2. Consent defaults are still DENIED before GTM loads:
   - analytics_storage = denied
   - ad_storage = denied
   - ad_user_data = denied
   - ad_personalization = denied
3. The standard GTM <noscript> iframe is rendered immediately after <body>.
4. TrackingManager no longer injects GTM dynamically after React hydration.
5. Public marketing pages no longer send Cross-Origin-Opener-Policy: same-origin.
6. Strict COOP remains enabled on:
   - /admin
   - /technician
   - /customer/account
   - /api
   - /login

This keeps the sensitive surfaces isolated while allowing Tag Assistant preview/debug on public pages.

## Database
No migration.

## Environment
No new environment variable.
Uses existing:
NEXT_PUBLIC_GTM_ID=GTM-TV8QG4SL

## Commit
V20C - fix GTM preview standard bootstrap
