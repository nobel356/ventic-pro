# Ventic Pro V13B — Archive Vault Expansion

Baseline:
- V13A stable main commit: `d7373a05beb2f3d2740a55c149fb9ecfb9c0866b`
- Commit message: `V13A - fix Prisma archive unique where runtime guard`

## What V13B adds

Archive Vault now supports:
- Orders (existing V13A)
- Staff users (existing V13A)
- Customers
- Leads
- Suppliers
- Inventory items

The same existing Archive Vault password is used. V13B does not reset it.

## How new archiving works

Open:
`/admin/archive`

After unlocking the Vault, users with `archive.manage` see:
`➕ أرشفة عنصر`

From there they can search active:
- customers;
- leads;
- suppliers;
- inventory items.

Every archive operation requires:
- archive permission;
- unlocked Archive Vault;
- a written reason;
- confirmation.

Every restore requires:
- `archive.restore`;
- unlocked Archive Vault.

## Customer safety

Customer archive:
- does NOT delete orders, invoices, properties, devices or history;
- disables the customer account;
- revokes customer sessions;
- invalidates unused password-reset codes;
- hides the customer from normal customer lists/profile/search.

Archive is blocked while the customer has:
- an active non-terminal order;
- an invoice with remaining due amount;
- open/scheduled/in-progress maintenance;
- open/scheduled/in-progress complaints.

Completed historical orders remain preserved.

## Lead safety

Lead archive:
- hides it from the operational lead follow-up screen;
- clears the next follow-up date while archived;
- preserves source/status/history;
- does not rewrite historical marketing analytics.

On restore, the previous next-follow-up date is restored.

## Supplier safety

Supplier archive:
- disables supplier selection for new purchases;
- hides the supplier from active supplier lists and global supplier search;
- preserves all old purchase receipts and supplier history.

Old receipts continue to show the archived supplier name.

## Inventory safety

Inventory item archive is blocked unless:
- company stock is zero;
- every technician custody balance for that item is zero;
- there is no DRAFT stocktake containing the item.

When archived:
- the item disappears from active inventory item lists/selections;
- historical inventory movements, purchases and stocktake history remain intact.

## Audit events

New immutable AuditLog events:
- `ARCHIVE_CUSTOMER`
- `ARCHIVE_CUSTOMER_RESTORED`
- `ARCHIVE_LEAD`
- `ARCHIVE_LEAD_RESTORED`
- `ARCHIVE_SUPPLIER`
- `ARCHIVE_SUPPLIER_RESTORED`
- `ARCHIVE_INVENTORY_ITEM`
- `ARCHIVE_INVENTORY_ITEM_RESTORED`

Existing V13A archive/vault logs remain unchanged.

## Database migration

Migration:
`20261011010000_archive_vault_entities`

It only adds archive metadata and indexes to:
- Customer
- Lead
- Supplier
- InventoryItem

No hard delete.
No destructive data rewrite.

## No new environment variables

V13B uses the existing:
- `AUTH_SECRET`
- Archive Vault configuration already stored in the database.

## Deliberate historical behavior

Archive is an operational visibility state, not accounting/history deletion.

Therefore:
- archived suppliers remain on historical receipts;
- archived inventory items remain on historical movement lines;
- archived customers remain attached to historical orders;
- archived leads may still remain represented in historical marketing analytics.

This avoids rewriting business history.

## Smoke test after deploy

1. Open `/admin/archive` and unlock with the existing Vault password.
2. Confirm the new tabs appear:
   - العملاء
   - Leads
   - الموردون
   - أصناف المخزون
   - ➕ أرشفة عنصر
3. Archive a disposable customer with no active obligations.
4. Confirm:
   - customer disappears from `/admin/customers`;
   - customer cannot log in;
   - customer appears in Archive Vault;
   - restore brings the customer back.
5. Try archiving a customer with unpaid/open work and confirm it is blocked.
6. Archive and restore a Lead.
7. Archive and restore a supplier that has historical receipts; confirm old receipts still show the supplier.
8. Try archiving an inventory item with non-zero stock and confirm it is blocked.
9. Zero a disposable test item and archive/restore it.
10. Review Archive Vault logs for actor/time/action.

## Rollout note

The V13B migration is additive, but Production build will apply it before Next.js compilation because Ventic Pro's build command runs production migrations first.

If a TypeScript build error appears after the migration succeeds:
- do not roll back the database manually;
- fix the code and redeploy;
- Prisma migrate will see the migration as already applied.
