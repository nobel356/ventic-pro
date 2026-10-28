# Ventic Pro V20G2 — Social Preview Fix

This replaces the failed V20G script. The first script was too strict when matching
the `openGraph` metadata block. V20G2 uses block-based line insertion instead.

## What it does
- Adds `/social-preview.png` to Open Graph metadata.
- Adds `/social-preview.png` to Twitter/X metadata.
- Deletes the failing dynamic routes:
  - `app/opengraph-image.tsx`
  - `app/twitter-image.tsx`
- Keeps all other site code unchanged.

## Apply
1. Extract directly into the Ventic Pro repository root.
2. Double-click `APPLY-V20G2.cmd`.
3. GitHub Desktop should show:
   - `app/layout.tsx` modified
   - `app/opengraph-image.tsx` deleted
   - `app/twitter-image.tsx` deleted
   - `public/social-preview.png` added/updated
4. Commit:
   `V20G2 - fix social preview images`
5. Push.
