# V12D.6 — OTP email diagnostics + truthful fallback result

This patch is intentionally safe for Production diagnostics.

It logs ONLY:
- whether customer email is present
- configured provider name
- whether RESEND_API_KEY exists (boolean only)
- whether EMAIL_FROM exists (boolean only)
- masked destination
- Resend HTTP status / short provider error response
- delivery channel/provider

It NEVER logs:
- API key value
- OTP value
- full customer email
- phone number

Functional fix included:
If WhatsApp/SMS fails and the Resend email attempt also fails, `deliverCompletionOtp()` now returns the actual EMAIL failure instead of discarding it and returning the older WhatsApp/SMS failure. This makes the Notification row and UI/debugging reflect the real Resend reason.

After deployment:
1. Wait 60 seconds if OTP cooldown is active.
2. Click "إصدار وإرسال كود OTP".
3. In Vercel Runtime Logs search for `OTP_EMAIL`.
4. Send the resulting lines/screenshots back for diagnosis.
5. Also check Resend Logs.

No schema or database migration.
