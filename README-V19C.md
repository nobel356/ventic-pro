# Ventic Pro V19C — Final Stabilization

Production/static QA patch after V19B.

## Fixes

### 1) Calculator -> Order handoff
The calculator no longer claims to fully prefill the order form.
It now:
- saves selected services and quantities in sessionStorage;
- preserves the estimate for the current session;
- shows the saved choices above `/order`;
- clearly tells the customer to confirm room-specific details in the order flow.

No useSearchParams is used.

### 2) Lead public-update guard
A public lead ID can no longer be used to overwrite a lead whose saved phone is different.
If the same browser changes to another phone number, a fresh lead is created instead.

### 3) Accurate offer impressions
`offer_view` is now recorded when an offer card is actually visible (35%+) using IntersectionObserver.
It is deduplicated per offer per browser session.

### 4) QR privacy hardening
Customer invoice/warranty/order URLs are no longer sent in clear text to the external QR image renderer.

Flow:
- customer asks for QR;
- authenticated internal API verifies ownership of the invoice/order;
- server encrypts the target path with AES-256-GCM using AUTH_SECRET-derived key;
- QR provider only receives `/q/<opaque-token>`;
- `/q/<token>` decrypts and redirects to the protected customer page;
- customer session protection remains unchanged.

`/q/` is also disallowed in robots.txt.

## Database
No Prisma migration.

## Environment
No new environment variable.
Uses the existing AUTH_SECRET.

## Install
Copy/Replace over repository root.

Commit:
`V19C - final stabilization calculator leads offers qr`

## QA conclusion
V19B build is green.
Static QA found no blocking route/permission regression.
V19C only closes the specific stabilization gaps above.
