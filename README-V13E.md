# Ventic Pro V13E — No-Reason Archive + Bulk Selection + True Hard Delete

Baseline:
- latest main before V13E: `f20f752751257fed2ad9684bbbf5b4f4e230ffbb`
- V13D already deployed.

## What changes

### Archive no longer asks for a reason
Archive buttons now use:
- one confirmation only;
- no reason prompt;
- no Archive Vault password for normal archive action.

The existing safety checks still stay active:
- cannot archive current user;
- cannot archive last active Super Admin;
- technician with active work is blocked;
- customer with active financial/service obligations is blocked;
- inventory item with non-zero stock/custody/draft stocktake is blocked.

Restore still requires Archive Vault unlock.

### Multi-select on the operational list pages

Bulk selection + `أرشفة المحدد` is added to:
- Orders
- Technicians
- Customers
- Leads
- Suppliers
- Inventory
- Users

Each screen has:
- row checkbox;
- select all visible / select all;
- bulk archive button.

### Archive Vault bulk operations

Inside `/admin/archive`, the management panel now supports:
- selecting multiple archived records;
- select all;
- restore selected;
- permanently delete selected.

### Permanent delete is now a real hard delete

The old V13D blocking rule was removed.

If Super Admin unlocks the Vault and types:
`حذف نهائي`

the selected archived record is actually removed.

Hard-delete behavior:

#### Order
Deletes/detaches its dependent operational records, including:
- financial/order children that cascade with the Order;
- order notifications;
- order admin notifications;
- order audit rows;
- technician schedule links;
- inventory movements connected to the order;
- installed device records sourced from the order;
- converted Lead link is detached before delete.

#### Customer
Deletes all the customer's Orders using the same hard-delete path, then deletes:
- customer notifications;
- customer account/sessions/reset data via existing DB cascades;
- properties/devices via existing DB cascades;
- customer itself.

#### User / Technician
Deletes the user account completely while preserving unrelated business rows by clearing nullable user references:
- assigned technician references;
- payment receiver;
- aftercare technician references;
- stock movement technician reference;
- purchasing/stocktake user references;
- audit actor ID is cleared while actorLabel remains;
- sessions/slots/admin notifications are removed.

#### Lead
Deletes the Lead completely.

#### Supplier
Deletes supplier purchase receipts and their supplier-linked receipt history, then deletes the supplier.

#### Inventory Item
Deletes:
- inventory movements for the item;
- stocktake lines;
- purchase receipt lines for the item;
- item itself.

Purchase receipt totals are recalculated after removing the deleted item's lines so old receipt totals do not stay mathematically wrong.

### Audit after permanent delete

The target's own order audit history can be removed as part of full deletion.
A security-level AuditLog remains for the permanent-delete action itself:
`ARCHIVE_PERMANENT_DELETE`

It stores:
- entity type;
- deleted target ID;
- actor/time through AuditLog.

## No new database migration

V13E uses the current V13D schema.
Do not run `prisma db push`.

## Installation

1. GitHub Desktop → Pull latest `main`.
2. Extract this ZIP.
3. Copy the CONTENTS of `Ventic-Pro-V13E-Bulk-Archive-Hard-Delete` into the root of `ventic-pro`.
4. Allow replace/merge.
5. Double-click:
   `APPLY-V13E.cmd`
6. Wait for:
   `V13E patch applied successfully.`
7. Open GitHub Desktop and review changes.
8. Commit:
   `V13E - bulk archive no reason and true permanent delete`
9. Push main.

## Important test sequence

Use disposable test records first.

1. Archive one Lead from the Lead list — confirm no reason prompt.
2. Select 2 disposable Leads → `أرشفة المحدد`.
3. Open Archive Vault and unlock.
4. In the bulk panel choose Leads, select both, restore together.
5. Archive them again, then permanently delete both.
6. Confirm they disappear after refresh.
7. Test a disposable Order hard-delete.
8. Confirm the Order and its related child records disappear.
9. Test Customer hard-delete only with a disposable customer.
10. Test Inventory hard-delete only with a disposable stock item.
11. Verify Production pages still load normally.

Permanent deletion is intentionally destructive and cannot be restored.
