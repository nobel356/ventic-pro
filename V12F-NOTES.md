# Ventic Pro V12F — Conversion + Trust Pack

No Prisma migration.
No new paid dependency.
No new required environment variable.

## What changed

### Homepage conversion upgrade
- Stronger value proposition and CTA.
- Trust chips: before/after photos, OTP, invoice/warranty, aftercare.
- "How it works" section.
- Service cards link to SEO service pages.
- Trust/documentation section.
- FAQ preview.
- Homepage CTAs include UTM tags so attribution from V12E can record them.

### Customer account
- Visual order timeline:
  received -> confirmed -> assigned -> on the way -> execution -> completed.
- Better action buttons.
- Invoice is clearly marked as printable/PDF.
- Warranty certificate button appears when a warranty exists.

### Printable warranty certificate
Route:
`/customer/account/warranty/[orderId]`

The page:
- is protected by the logged-in customer session;
- only loads an order owned by that customer;
- shows warranty dates/status;
- shows technician, address, services, and installed devices;
- supports browser "Print / Save PDF";
- links to the existing warranty policy.

### Branded HTML email copies
Customer notification emails now use a Ventic Pro HTML template with:
- navy/orange branding;
- Arabic RTL layout;
- text fallback remains included;
- safe escaped message content;
- safe diagnostics remain enabled.

OTP email delivery in `lib/customer-messaging.ts` is intentionally untouched so the already-tested completion/password-reset OTP path remains stable.

### System Health email test
The Super Admin test-email button now tests the new branded HTML email path.

## Suggested smoke test after deployment
1. Homepage renders and reviews still update live.
2. Create/open a customer order and inspect timeline.
3. Complete an order with warranty, then open warranty certificate.
4. Use Print / Save PDF on invoice and warranty.
5. Send a test email from `/admin/system-health`.
6. Trigger one normal customer notification and verify the HTML email.
