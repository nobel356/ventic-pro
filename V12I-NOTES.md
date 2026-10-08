# Ventic Pro V12I — Order Profitability / Known Contribution

No Prisma schema change.
No migration.
No new dependency.
No paid service.
No new environment variable.

## New page
`/admin/profitability`

Visibility requires both:
- `reports.view`
- `inventory.cost.view`

Manual direct-cost entry requires the existing:
- `payments.manage`

## What the dashboard calculates
For each order:

`known contribution = order value - estimated materials - allocated advertising - manual direct costs`

Where:
- order value = invoice total, otherwise final total, otherwise estimated total;
- paid = invoice paid amount;
- materials = TECH_OUT inventory quantity × current `averageUnitCost`;
- advertising = matching source/campaign spend allocated equally across matching orders in the selected period;
- manual direct costs = labor / transport / other costs recorded by staff.

Filters:
- 7 days
- 30 days
- 90 days
- 365 days

The page includes:
- total order value;
- collected amount;
- estimated material cost;
- allocated ad spend;
- manual direct costs;
- known direct cost;
- known contribution;
- known margin %;
- negative-contribution order count;
- unallocated ad spend;
- profitability by area;
- profitability by service;
- per-order table;
- CSV export.

## Manual order costs
Stored as immutable existing `AuditLog` events:
- `ORDER_COST_RECORDED`
- `ORDER_COST_VOIDED`

Nothing is hard-deleted. Corrections are void events.

Categories:
- LABOR
- TRANSPORT
- OTHER

## Important accounting limitation
This page intentionally does NOT call the result "net profit".

It does not automatically include:
- rent;
- salaries not assigned to an order;
- taxes;
- general overhead;
- depreciation;
- historical inventory cost snapshots.

For old/current material usage, the system uses the inventory item's current `averageUnitCost`, so material cost is an operational estimate.

## Advertising allocation
A spend record with a campaign is divided equally over matching source + campaign orders in the selected period.

A source-only spend record is divided equally over all matching-source orders in the period.

Spend with no matching orders is shown as `إعلان غير موزع` instead of being hidden.

## Smoke test
1. Open `/admin/profitability`.
2. Check 7 / 30 / 90 / 365 day filters.
3. Choose an order and record 100 EGP LABOR cost.
4. Confirm the order contribution decreases by 100 EGP after reload.
5. Void the test cost and confirm the contribution returns.
6. Confirm an order with TECH_OUT materials shows estimated material cost.
7. Confirm marketing spend from V12H is allocated to matching orders.
8. Export CSV.
