# V12D.4 — Restore PAYMENTS_MANAGE permission

The migration completed successfully in the previous deployment.

The Next.js typecheck then found one regression:
`PERMISSIONS.PAYMENTS_MANAGE` was referenced by invoice/payment routes but was accidentally omitted when V12D rebuilt `lib/permission-config.ts` from an older base.

This patch restores:
- `PAYMENTS_MANAGE: "payments.manage"`
- the permission option shown in user management
- ADMIN default access to the permission

No database/schema/migration change.
