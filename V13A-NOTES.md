# Ventic Pro V13A — Archive Vault

Baseline:
- V12K commit: `0092f031bbf73cd427a261b903615884c777df92`

## Goal

Add safe, reversible deletion for operational records without destroying financial/history data.

V13A starts with:
- Orders
- Staff users

The architecture is designed so more entity types can be added later.

## Core behavior

### Soft delete / archive
"Delete" means archive, not hard delete.

Archived records:
- remain in PostgreSQL;
- keep IDs and relations;
- keep invoices, payments, photos, warranty and audit history;
- disappear from normal application reads;
- are visible only inside Archive Vault;
- can be restored.

### Archive Vault
Route:
`/admin/archive`

Opening the vault requires:
1. a logged-in staff account;
2. `archive.view` permission;
3. a separate Archive Vault password.

The Vault password:
- is configured by Super Admin on first use;
- is stored only as an scrypt hash;
- is never stored in plaintext;
- creates a short-lived 20-minute HttpOnly unlock cookie;
- changing the password increments the Vault version and invalidates old unlock sessions.

### Permissions
New permissions:
- `archive.view`
- `archive.manage`
- `archive.restore`

Super Admin has all permissions automatically.

These permissions are intentionally NOT added to ADMIN/CUSTOMER_SERVICE role defaults.
Grant them explicitly from `/admin/users`.

### Audit events
Archive Vault writes immutable AuditLog events:
- `ARCHIVE_ORDER`
- `ARCHIVE_ORDER_RESTORED`
- `ARCHIVE_USER`
- `ARCHIVE_USER_RESTORED`
- `ARCHIVE_VAULT_UNLOCKED`
- `ARCHIVE_VAULT_UNLOCK_FAILED`
- `ARCHIVE_VAULT_UNLOCK_RATE_LIMITED`
- `ARCHIVE_VAULT_LOCKED`
- `ARCHIVE_VAULT_PASSWORD_SET`
- `ARCHIVE_VAULT_PASSWORD_CHANGED`

No password value is written to AuditLog.

## Order archive safety

When an order is archived:
- its operational record is soft-deleted;
- technician slots linked directly to the order are snapshotted then removed so they do not block the calendar;
- a published review is temporarily unpublished;
- invoice/payment/photos/warranty/etc. stay untouched.

When restoring:
- slot snapshots are checked for scheduling conflicts;
- restoration is blocked if an active order points to an archived/inactive technician;
- technician slots are recreated;
- the prior public review publication state is restored.

## User archive safety

When a user is archived:
- `active` becomes false;
- current sessions are deleted;
- original active state is snapshotted.

Protection:
- cannot archive your own logged-in account;
- cannot archive the last active Super Admin;
- technician archive is blocked while the technician still has active orders, aftercare work, or future active slots.

Restoring returns the user's previous active state.

## Visibility hardening

`lib/prisma.ts` now exports:
- `prisma`: normal app client with archive visibility guards.
- `rawPrisma`: unfiltered client, reserved for Archive Vault internals.

The normal client hides archived Orders/Users and order-scoped financial/operational records from normal top-level reads.

Explicit nested filters were also added to:
- customer account;
- admin customer profile/list;
- technician performance.

## Database migration

Migration:
`20261009010000_archive_vault`

Adds:
- archive metadata to `User`;
- archive metadata to `Order`;
- `ArchiveVaultSetting`.

No destructive migration.
No existing row is deleted or rewritten.

## New paid services

None.

## New environment variables

None.

`AUTH_SECRET` must already exist because it is used to sign the temporary Archive Vault unlock token.

## Smoke test

1. Deploy V13A.
2. Sign in as Super Admin.
3. Open `/admin/archive`.
4. Set a Vault password (10+ chars).
5. Create a disposable test order.
6. Open the order and archive it with a reason.
7. Confirm:
   - it disappears from `/admin/orders`;
   - it disappears from customer account;
   - it appears inside Archive Vault;
   - Archive log identifies the actor.
8. Restore it.
9. Confirm it returns to normal screens.
10. Create a disposable staff user.
11. Archive it.
12. Confirm the user disappears from `/admin/users` and cannot keep an active session.
13. Restore the user.
14. Give a non-Super-Admin custom archive permissions and verify each permission boundary.
15. Test five incorrect Vault passwords and confirm rate limiting.
16. Change the Vault password and confirm an old unlocked browser session must unlock again.

## Important

V13A intentionally does NOT add permanent hard-delete for:
- invoices;
- payments;
- audit logs;
- warranty history;
- financial events.

Those records are business history and should not be destructively removable from the normal UI.
