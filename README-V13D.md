# Ventic Pro V13D — Archive Operations

Baseline:
- main after V13C
- latest verified commit before this package: `0ce5629b3afe498b812f5ae2053a07233ac040ab`
- commit message: `V13C patch applied successfully WITHOUT Node`

## V13D adds

### 1. Archive button directly on operational list screens
No need to open the detail file first.

Archive buttons are added to:
- Orders
- Technicians
- Customers
- Leads
- Suppliers
- Inventory items

The existing Users screen already had archive capability from V13A.

If an entity requires the Vault to be unlocked, the inline button asks for the Archive Vault password and continues without sending you to the archive page.

All existing archive safety rules still apply.

### 2. Permanent deletion inside Archive Vault

A new Super Admin-only panel appears inside `/admin/archive`.

Permanent deletion requires:
- Super Admin
- Vault unlocked
- typing exactly `حذف نهائي`

The system refuses permanent deletion when it would destroy important business history.

Examples blocked:
- Order with invoice/payment/warranty/aftercare/review/photos/inventory history.
- User with operational/payment/inventory history.
- Customer with orders or properties.
- Lead converted to an order.
- Supplier with purchase receipts.
- Inventory item with stock, movements, purchases or stocktake history.

Clean archived records can be permanently deleted.

Before deletion, an immutable AuditLog event is created:
- ARCHIVE_ORDER_PURGED
- ARCHIVE_USER_PURGED
- ARCHIVE_CUSTOMER_PURGED
- ARCHIVE_LEAD_PURGED
- ARCHIVE_SUPPLIER_PURGED
- ARCHIVE_INVENTORY_ITEM_PURGED

### 3. Forgot Archive Vault password by email

Open:
`/admin/archive/reset`

Or click:
`نسيت كلمة سر الأرشيف؟`

The recovery destination is:
`MOHAMEDNABIL356@GMAIL.COM`

Internally the code uses:
`ARCHIVE_RECOVERY_EMAIL`
when present, otherwise it falls back to the address above.

Recovery security:
- Super Admin session required.
- Reset requests are rate-limited.
- Token is random and only its SHA-256 hash is stored.
- Link expires after 20 minutes.
- Successful password reset increments the Vault version.
- All previous Vault unlock sessions become invalid.
- Reset request and successful reset are written to AuditLog.

### Database migration

Migration:
`20261015010000_archive_vault_recovery`

Adds only:
- resetTokenHash
- resetTokenExpiresAt
- resetRequestedAt

to ArchiveVaultSetting.

No existing business records are deleted or rewritten by the migration.

## Installation — no Node required locally

1. Pull latest `main` in GitHub Desktop.
2. Extract the V13D ZIP.
3. Copy the CONTENTS of `Ventic-Pro-V13D-Archive-Operations` into the root of `ventic-pro`.
4. Allow folder merge / file replacement.
5. Double-click:
   `APPLY-V13D.cmd`
6. Wait for:
   `V13D patch applied successfully.`
7. Open GitHub Desktop and review the changes.
8. Commit:
   `V13D - inline archive permanent purge and vault recovery`
9. Push `main`.

Do not run `prisma db push`.
The existing Vercel build will apply the included migration.

## Smoke test

1. Open Orders and archive a disposable order directly from the list.
2. Open Customers and archive a disposable customer directly from the list.
3. Test Technician / Lead / Supplier / Inventory archive buttons.
4. Open `/admin/archive`, unlock it, then press `تحديث بعد فتح الخزنة` in the permanent delete panel.
5. Permanently delete a disposable clean Lead.
6. Try permanently deleting an entity with history and confirm it is blocked.
7. Open `/admin/archive/reset`.
8. Send a recovery email.
9. Open the emailed link while logged in as Super Admin.
10. Set a new Vault password.
11. Confirm the old Vault password no longer opens the Vault.
