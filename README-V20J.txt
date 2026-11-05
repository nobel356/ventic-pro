Ventic Pro V20J — Dual OTP Channels

Adds an explicit OTP delivery choice:
- Mobile
- Email

Security design:
- Phone number still identifies the Customer record because phone is unique in the database.
- Email is NOT used alone to identify the account because Customer.email is not unique.
- Email OTP is sent through the existing Resend integration.
- Mobile OTP uses the existing WhatsApp/SMS delivery path.
- An explicit Mobile choice never silently falls back to Email.

Tested against Production commit:
b31fca9178a979b5c04a11897942ee5e9a1973b7

Sandbox verification:
- V20J dual OTP guard: PASS
- V20I customer account claim guard: PASS
- V20H Admin API guard: 52 routes PASS
- Prisma generate: PASS
- TypeScript: 0 errors
- git apply --3way --index: clean
- git diff --cached --check: PASS

Important production configuration:
Email is already configured through Resend.
The mobile option requires a real WhatsApp Cloud or SMS provider configuration in Vercel before phone OTP can actually be delivered.
