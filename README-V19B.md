# Ventic Pro V19B — Conversion Type Hotfix

Fixes Vercel TypeScript build error:

Type 'string | undefined' is not assignable to
'string | number | boolean | null'

at:
app/callback/CallbackClient.tsx

## Changes
- Callback event only adds `service` when it has a value.
- `trackConversion` now safely accepts optional `undefined` metadata values.
- Undefined metadata is stripped before JSON is sent.
- No DB migration.
- No env changes.

Commit:
V19B - fix conversion tracking TypeScript build
