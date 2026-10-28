# Ventic Pro V20E — Detailed Lead Notifications

Fixes missing admin notifications for DETAILED_ENTRY leads.

Before:
- QUICK_REQUEST -> admin notification
- CALLBACK -> admin notification
- DETAILED_ENTRY -> saved in Lead Recovery only, no notification

After:
- DETAILED_ENTRY creates one admin notification:
  - title: عميل بدأ طلب تفصيلي
  - message: name + phone + current step + source
  - link: /admin/lead-recovery
- Deduplicated per lead using:
  detailed-lead:<leadId>
- Existing/recent detailed leads can generate the missing notification once after this patch.
- No repeated notification on every step for the same lead.

No Prisma migration.
No env changes.

Commit:
V20E - notify admins for detailed leads
