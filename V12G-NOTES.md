# Ventic Pro V12G — Marketing Analytics

No Prisma migration.
No new dependency.
No new paid service.
No new required environment variable.

## New page
`/admin/marketing-analytics`

Access uses the existing `reports.view` permission.

## What it shows
- 7 / 30 / 90 day filters.
- Leads.
- Converted leads.
- Lead conversion rate.
- Orders.
- Completed / cancelled orders.
- Invoice value.
- Paid value.
- Average recorded order value.
- Acquisition-source coverage.
- Best source.
- Best UTM campaign.
- Open / abandoned leads.
- Funnel by order-form step.
- Daily Leads vs Orders chart.
- Source performance table.
- Campaign performance table.
- Best `utm_content` per campaign.
- CSV export.

## Attribution
The dashboard understands the V12E format:
`Facebook [medium=paid_social; campaign=launch; content=video_01]`

It also handles older/simple values such as:
`Facebook`
`Instagram`
`Google`
or empty source.

## Financial meaning
- Invoice value = actual invoice total stored in Ventic Pro.
- Paid value = actual paid amount stored on the invoice.
- Average order value = invoice total when available, otherwise final total, otherwise estimated total.

The dashboard intentionally does not invent CPA/ROAS because advertising spend is not stored yet.

## Smoke test
1. Open `/admin/marketing-analytics`.
2. Switch between 7, 30 and 90 days.
3. Confirm sources/campaigns appear from previous UTM test orders.
4. Create a fresh campaign link from `/admin/marketing`.
5. Complete one test order through that link.
6. Refresh analytics and confirm the source/campaign/order appears.
7. Click `تصدير CSV`.
