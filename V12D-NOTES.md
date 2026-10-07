# Ventic Pro V12D — Trust, Legal, Reviews, Email & User Switching

## 1. Quick user switching
New permission:
- `users.impersonate`

A user with this permission can switch temporarily to another active internal user from the account menu without logging out.

Security:
- the original authenticated session remains the root session
- switching uses a signed HttpOnly cookie
- the switch expires after 8 hours
- non-SUPER_ADMIN users cannot switch into SUPER_ADMIN
- start/stop events are written to AuditLog
- the account menu clearly shows when the user is in switch mode and provides "الرجوع إلى حسابي الأصلي"

Because existing users with custom permission lists do not automatically receive new permissions, grant `التبديل بين المستخدمين` manually to the accounts that should have it.

## 2. Reviews
Customer:
- completed orders show `قيّم الخدمة`
- rating categories: overall, punctuality, professionalism, installation quality, cleanliness, communication, value for money
- optional written comment and punctuality note
- separate consent checkbox to allow public display

Admin:
- new page `/admin/reviews`
- new permission `reviews.manage`
- a review can be published publicly only when:
  - customer consented
  - a written comment exists
  - overall rating is 4 or 5
- publishing/unpublishing is written to AuditLog

Public:
- homepage shows only approved, consented, 4–5 star comments
- public display uses only the customer first name
- no phone, address or order number is shown

## 3. Customer email
Database adds:
- `Customer.email`

New orders and new customer registrations require a valid email address.

`notifyCustomer()` now:
- sends the normal WhatsApp/SMS operational notification when configured
- separately sends an email copy when a customer email exists
- logs the email delivery in `Notification`

Current operational notifications automatically get email copies:
- account created
- order received
- order status / appointment updates
- technician assigned
- technician on the way / execution updates
- Ventic Pro estimate sent
- payment recorded
- order completed / warranty
- password reset can use email as fallback
- completion OTP can use email as fallback when phone messaging is unavailable

To enable real email:
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `EMAIL_FROM=Ventic Pro <notifications@your-domain.com>`

Use a verified sending domain before wide production launch.

## 4. Legal pages
Added:
- `/legal/terms`
- `/legal/privacy`
- `/legal/refund`
- `/legal/warranty`

Order confirmation now records legal acceptance and policy version in AuditLog.
Customer registration also requires acceptance of Terms and Privacy.

The refund page reflects the Egyptian Consumer Protection Agency's currently published general rules for eligible goods:
- 14 days for exchange/return without reason, subject to statutory exceptions
- 30 days for defective goods

The legal text is drafted as an operational baseline, not a substitute for review by an Egyptian lawyer before a large commercial launch.

## 5. WhatsApp floating button
Set:
- `NEXT_PUBLIC_WHATSAPP_NUMBER=2010xxxxxxxx`

The button:
- appears across the application when configured
- asks for confirmation before opening WhatsApp
- opens WhatsApp in a new tab so the current page remains open

## 6. Social media footer
Optional:
- `NEXT_PUBLIC_FACEBOOK_URL`
- `NEXT_PUBLIC_INSTAGRAM_URL`
- `NEXT_PUBLIC_TIKTOK_URL`
- `NEXT_PUBLIC_YOUTUBE_URL`

Also recommended:
- `NEXT_PUBLIC_SUPPORT_EMAIL`
- `NEXT_PUBLIC_SUPPORT_PHONE`
- `NEXT_PUBLIC_LEGAL_NAME`

## 7. Database migration
This package includes:
`prisma/migrations/20261007090000_customer_email_public_reviews/migration.sql`

The build command changes to:
`prisma generate && prisma migrate deploy && next build`

The migration is additive:
- Customer.email
- Review.publicConsent
- Review.isPublished
- Review.publishedAt
- indexes

It does not delete existing order, customer, review, payment or inventory data.

## 8. Recommended post-deploy test
1. Grant `users.impersonate` to one admin.
2. Switch admin -> customer service -> back to original account.
3. Create a new customer order with email.
4. Confirm order legal acceptance.
5. Complete an order and open rating from customer account.
6. Submit a 5-star review with public consent.
7. Publish it from `/admin/reviews`.
8. Confirm comment appears on homepage without sensitive data.
9. Add WhatsApp/social env vars and confirm floating button.
10. Configure Resend and confirm order/status/payment emails are delivered.
