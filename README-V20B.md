# Ventic Pro V20B — TrackingManager Type Hotfix

Fixes the Vercel TypeScript error in:
app/shared/TrackingManager.tsx

Error:
Cannot invoke an object which is possibly 'undefined'

Changes:
- Uses the guaranteed local `gtag` function returned from `ensureGoogleQueue()`.
- Narrows optional `window.gtag` and `window.clarity` to local constants before invoking them.
- No behavior change.
- No migration.
- No env changes.

Commit:
V20B - fix tracking manager TypeScript build
