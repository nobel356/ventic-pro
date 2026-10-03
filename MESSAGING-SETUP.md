# Ventic Pro — OTP Messaging Setup

The current staging setup works without a messaging provider:
- Keep `MESSAGING_PROVIDER=disabled`.
- The completion OTP is shown only inside the execution screen for testing.
- The OTP itself is never stored in the Audit Log or Notification payload.

## Production WhatsApp (primary)

Set these Vercel environment variables:

- `MESSAGING_PROVIDER=whatsapp_cloud`
- `WHATSAPP_PHONE_NUMBER_ID=...`
- `WHATSAPP_ACCESS_TOKEN=...`
- `WHATSAPP_GRAPH_VERSION=v23.0` (optional)
- `WHATSAPP_OTP_TEMPLATE=...` (optional)
- `WHATSAPP_OTP_TEMPLATE_LANGUAGE=ar` (optional)

If `WHATSAPP_OTP_TEMPLATE` is omitted, the adapter sends a text message. For production use outside an active WhatsApp customer-service window, use an approved Meta template.

## SMS fallback (Twilio)

- `SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID=...`
- `TWILIO_AUTH_TOKEN=...`
- `TWILIO_FROM_NUMBER=...`

The system attempts WhatsApp first, then SMS if WhatsApp is not delivered.

## Staging OTP visibility

- `OTP_STAGING_VISIBLE=true` explicitly shows the OTP in the execution screen.
- Set `OTP_STAGING_VISIBLE=false` before broad production use.
- If the variable is omitted while `MESSAGING_PROVIDER=disabled`, staging visibility is enabled automatically.

## Operational behavior

- OTP expires after 15 minutes.
- Resend cooldown is 60 seconds.
- Audit Log records issuance, delivery channel/status, actor and expiry — never the OTP itself.
- Completion still requires accepted Ventic Pro quotation, before/after photos, materials confirmation and the valid customer OTP.
