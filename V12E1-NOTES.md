# V12E.1 — Manifest TypeScript Fix

Build error fixed:

`purpose: "any maskable"` is not accepted by Next.js 15.5.26 `MetadataRoute.Manifest` typings.

Changed both icon entries to:

`purpose: "maskable"`

No database changes.
No environment variable changes.
No migration.
