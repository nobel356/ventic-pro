# Ventic Pro V20G — Social Preview Fix

Fixes the production runtime errors on:
- /opengraph-image
- /twitter-image

## What changes
- Adds a static 1200x630 preview image at `public/social-preview.png`.
- Points Open Graph metadata to `/social-preview.png`.
- Points Twitter/X metadata to `/social-preview.png`.
- Removes the two dynamic Next.js image routes that were failing in production.

## Why
The dynamic `ImageResponse` routes were throwing font/OpenType rendering errors in production.
A static asset is faster, cacheable and more reliable for WhatsApp, Facebook, LinkedIn and X link previews.

## Apply
1. Extract this ZIP directly into the Ventic Pro repository root.
2. Double-click `APPLY-V20G.cmd`.
3. Open GitHub Desktop and confirm:
   - `app/layout.tsx` modified
   - `app/opengraph-image.tsx` deleted
   - `app/twitter-image.tsx` deleted
   - `public/social-preview.png` added
4. Commit and push:

V20G - fix social preview images

## No changes to
- Database
- Prisma migrations
- Order flow
- Leads
- Email
- Analytics events
- Domain/DNS
