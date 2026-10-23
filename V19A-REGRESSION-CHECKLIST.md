# V19A Regression Checklist

## Build
- Vercel: `Compiled successfully`
- Type check passes.
- Static pages generation passes؛ خصوصًا `/callback`.

## Public
- `/`
- `/calculator`
- `/offers`
- `/why-ventic`
- `/works`
- `/areas`
- 3 service pages
- `/sitemap.xml`
- `/robots.txt`
- random URL => custom 404

## Calculator
- prices load.
- quantity changes total.
- DUCT_METER accepts 0.5.
- order/callback buttons work.

## Order
- normal order without referral unchanged.
- normal coupon unchanged.
- referral link `/ref/CODE` redirects to order.
- order shows referral banner.
- referral discount applies.
- coupon + referral do not stack.
- referral code appears as `REF:CODE` in order snapshot.
- generated Ventic estimate retains referral discount.

## Leads
- callback creates/updates lead.
- admin notification appears.
- Lead Recovery page opens.
- phone link only when consent exists.

## Works
- videos do NOT iframe-load until clicked.
- YouTube works.
- TikTok works.
- filters work.
- `عاوز تنفيذ مشابه` opens callback.

## Admin
- Growth Dashboard.
- Conversion Tracking.
- Referrals.
- Lead Recovery.
- Security Audit Super Admin only.

## Referral reward
- create code.
- copy link.
- use it in an order.
- Uses increments.
- Register reward button moves Rewarded Uses to current Uses.

## Customer
- invoice still prints.
- warranty still prints.
- QR button appears on invoice/warranty/order details.
- QR protected page still requires login in a fresh browser.
- review submits.
- recommendation question required.
- Google review CTA only appears when env is configured and rating/recommendation qualify.

## Mobile / iPhone
- menu/back still work.
- bottom bar does not cover form buttons.
- inputs remain 16px+.
- safe-area preserved.
