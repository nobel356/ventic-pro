# Ventic Pro V12J — Executive Control Center

No Prisma schema change.
No migration.
No new dependency.
No new paid service.
No new environment variable.

## What changed
The `/admin` homepage is now a real Executive Control Center instead of a simple collection of counters.

It is permission-aware and only exposes sections the current staff account is allowed to see.

## Priority engine
Open issues are sorted automatically into:

1. Critical
2. High
3. Follow-up

Current decision signals include:

- completed orders with negative known contribution;
- failed customer notifications in the last 7 days (Super Admin);
- unpaid invoice balances;
- NEW orders older than 30 minutes;
- confirmed/new orders without technician assignment;
- open complaints;
- low-stock items;
- campaigns with invoice ROAS below 1x in the last 30 days;
- ad spend that cannot be allocated to matching orders;
- due Lead follow-ups;
- open maintenance;
- draft stocktakes;
- estimates waiting for customer response.

## Live behavior
`ExecutiveDashboardRefresh` refreshes the server dashboard every 60 seconds while the browser tab is visible.

There is also a manual refresh button and a visible Cairo-time "last updated" timestamp.

## Permission safety
Financial/profitability data is only calculated and shown when the current user has both:

- `reports.view`
- `inventory.cost.view`

Failed delivery diagnostics are shown only to `SUPER_ADMIN`.

Quick links also respect the current user's permissions.

## Profitability meaning
The negative-contribution alert uses the existing V12I methodology:

order value
- estimated materials
- allocated ad cost
- recorded direct operating costs

This is NOT accounting net profit.

## Marketing signals
V12J reads existing V12H advertising-spend events and current UTM attribution.

A campaign is flagged as weak when:
- it has recorded ad spend;
- it has at least one matching order in the last 30 days;
- invoice/fallback order value divided by spend is below 1x.

Spend with no matching source/campaign orders in the last 30 days appears as unallocated spend.

## Smoke test
1. Open `/admin`.
2. Confirm the page title is `Executive Control Center`.
3. Confirm the page shows only sections allowed by the current role.
4. Check the last-updated timestamp and manual refresh button.
5. If you have an unpaid invoice, verify a collection action card appears.
6. If you have a low-stock item, verify the inventory card appears.
7. If V12I has a negative completed order, verify the profitability alert appears.
8. If V12H has ad spend without a matching campaign/order, verify the unallocated-spend alert.
9. Open a decision card and confirm it links to the correct operational section.
