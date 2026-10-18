# V16D — Presign Access Hotfix

Fix build error from @vercel/blob 2.4.0.

The current SDK requires:
`access: "private"`
inside every `presignUrl()` call.

Files:
- app/api/admin/portfolio-videos/route.ts
- app/api/portfolio-videos/route.ts

Commit:
`V16D - fix private presign access build error`

No migration.
No env change.
