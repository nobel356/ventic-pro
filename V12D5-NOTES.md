# V12D.5 — Completion OTP email delivery fix

Root cause:
`issueExecutionOtp()` loaded the customer's email from the database, but did not pass it to `deliverCompletionOtp()`.
As a result, when WhatsApp/SMS were unavailable, the email fallback never ran and Resend showed no log.

Fix:
- pass `order.customer.email` to `deliverCompletionOtp`
- record successful OTP email notifications with channel `EMAIL`
- show the correct UI message when OTP is delivered by email
- update the admin failure alert to mention email too

No database migration.
