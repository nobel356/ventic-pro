# Ventic Pro V12H — Cost + ROAS Tracking

No Prisma schema change.
No database migration.
No new dependency.
No new paid service.
No environment variable required.

## Storage design
Advertising spend is stored as immutable events in the existing `AuditLog` table:

- `MARKETING_SPEND_RECORDED`
- `MARKETING_SPEND_VOIDED`

This gives us:
- no migration risk;
- full audit history;
- actor name/id;
- corrections by voiding instead of silently deleting financial history.

## New page
`/admin/marketing-spend`

Super Admin only.

You can record:
- source (Facebook / Instagram / Google / etc.);
- campaign (optional);
- amount in EGP;
- spend date;
- note.

Existing UTM sources/campaigns are suggested automatically.

## Marketing Analytics additions
`/admin/marketing-analytics`

Now includes:
- total ad spend;
- CPL = spend / leads;
- CPA = spend / orders;
- CAC = spend / new customers;
- invoice ROAS = invoice value / spend;
- collected ROAS = collected value / spend;
- marketing contribution = invoice value - ad spend;
- cost and ROAS by source;
- cost and ROAS by campaign;
- best ROAS campaign;
- CSV export includes spend, CPL, CPA, CAC, ROAS and contribution.

## Important financial definition
`بعد تكلفة الإعلان فقط` is NOT net profit.

It subtracts advertising spend only and does NOT subtract:
- materials;
- technician labor;
- transport;
- salaries;
- taxes;
- overhead.

This keeps the dashboard useful without showing a false profit number.

## New-customer CAC
A customer is counted as new when their first-ever order falls inside the selected 7/30/90-day period. The source/campaign of that first order receives the new-customer attribution.

## Smoke test
1. Open `/admin/marketing-spend`.
2. Record e.g. Facebook / a real campaign / 100 EGP / today.
3. Open `/admin/marketing-analytics?period=30`.
4. Confirm total spend shows 100 EGP.
5. Confirm the same source/campaign row shows 100 EGP.
6. If the campaign has orders, CPA/ROAS should calculate.
7. Export CSV and verify the new fields.
8. Void the test spend and confirm analytics removes it after refresh.
