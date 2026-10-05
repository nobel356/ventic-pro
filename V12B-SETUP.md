# Ventic Pro V12B — Persistent Storage & Customer Messaging

V12B adds real persistent private photo storage and production customer messaging.

## 1. Vercel Blob — required for real photos

Create or connect a Vercel Blob store to the SAME Vercel project used by Ventic Pro.

Recommended:
- Private Blob store.
- New Vercel Blob projects can use Vercel OIDC automatically.
- Existing stores can continue with their Blob token if Vercel supplies one.

Set:
`STORAGE_PROVIDER=vercel_blob`

The application uses:
- private uploads for before/after installation photos
- authenticated streaming through `/api/attachments/[id]`
- no public raw Blob URL is stored in the database
- `Attachment.storagePath` stores the Blob pathname only

The execution screen compresses large camera images in the browser before upload.
Server-side accepted image size after compression: 4 MB.

Old records whose `storagePath` starts with `pending://` were created before persistent storage existed and cannot be recovered automatically.

## 2. WhatsApp Cloud — primary messaging

Production OTP and customer lifecycle messaging can use Meta WhatsApp Cloud.

Set:
- `MESSAGING_PROVIDER=whatsapp_cloud`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_GRAPH_VERSION=v23.0` (optional)
- `WHATSAPP_TEMPLATE_LANGUAGE=ar` (optional)

Completion OTP:
- `WHATSAPP_ORDER_COMPLETION_OTP_TEMPLATE=...`
- legacy `WHATSAPP_OTP_TEMPLATE` is still accepted as a fallback

Password reset:
- `WHATSAPP_PASSWORD_RESET_TEMPLATE=...`
- `WHATSAPP_PASSWORD_RESET_TEMPLATE_LANGUAGE=ar` (optional)

Recommended approved templates:
- `WHATSAPP_ORDER_RECEIVED_TEMPLATE`
  parameters: customer name, order number, date, time, estimated total
- `WHATSAPP_ORDER_STATUS_TEMPLATE`
  parameters: order number, new status
- `WHATSAPP_TECHNICIAN_ASSIGNED_TEMPLATE`
  parameters: order number, technician name, date, time
- `WHATSAPP_TECHNICIAN_ON_THE_WAY_TEMPLATE`
  parameters: order number, technician name
- `WHATSAPP_ESTIMATE_SENT_TEMPLATE`
  parameters: order number, estimate version, total, approval URL
- `WHATSAPP_PAYMENT_RECEIVED_TEMPLATE`
  parameters: order number, payment amount, due amount
- `WHATSAPP_ORDER_COMPLETED_TEMPLATE`
  parameters: order number, warranty end date, invoice total

If a template is missing the adapter can send a normal WhatsApp text, but outside an active customer-service conversation window Meta normally requires an approved template.

## 3. SMS fallback — optional but strongly recommended

Set:
- `SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID=...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_FROM_NUMBER=...`

Delivery order:
1. WhatsApp
2. SMS
3. optional email, if an email is supplied by a future customer flow

## 4. Email adapter — optional foundation

The adapter supports Resend:
- `EMAIL_PROVIDER=resend`
- `RESEND_API_KEY=...`
- `EMAIL_FROM=Ventic Pro <notifications@your-domain.com>`

Current customer accounts are phone-first and do not yet store a customer email field, so normal production notifications currently use WhatsApp/SMS.

## 5. App URL

Set the final public application URL:
`NEXT_PUBLIC_APP_URL=https://your-domain.com`

This is used to build the customer approval link sent with a Ventic Pro estimate.

## 6. Production safety flags

Production:
- `OTP_STAGING_VISIBLE=false`
- `PASSWORD_RESET_STAGING_VISIBLE=false`

V12A already prevents staging OTP exposure on a Vercel Production deployment.

## 7. What now sends automatically

The Notification table records every delivery result without storing OTP values.

Automatic customer messages:
- order received
- admin order status update
- appointment update
- technician assigned
- technician on the way / arrived / execution update
- Ventic Pro estimate sent with approval link
- payment received
- completion OTP
- order completed + warranty
- password reset OTP

Messaging failure does NOT roll back the order/payment/status business operation. It is logged as FAILED so the operation remains consistent.

## 8. Validation

After configuring Vercel environment variables run locally with pulled Vercel env, or from an equivalent environment:

`npm run integrations:check`

It validates configuration names without printing secrets.
