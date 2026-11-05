Ventic Pro V20P - Resilience Control Center

Base commit:
8d50c0395cda64cc86487a61ad29ea4e6bc682ea
V20N - archive vault integrity lockdown

Purpose:
Keep Ventic Pro operational even while messaging/OTP integrations are not ready.
The minimum supported path is customer name + Egyptian mobile number.

Install:
1. Extract this ZIP inside the ventic-pro repository.
2. Run APPLY-V20P.cmd.
3. Confirm it prints: V20P APPLIED SUCCESSFULLY
4. Commit with:
   V20P - resilience control center and lead fallback
5. Push main.
6. After Vercel Production is READY, open /admin/control-center as SUPER_ADMIN.

Do not install V20O separately after V20P.
Do not commit .v20p-backup-* folders.

Recommended current configuration:
- Mode: NORMAL
- Lead Capture: ON
- Detailed Orders: ON
- Customer Accounts: ON
- Account Registration: OFF
- Phone OTP: OFF
- Email OTP Recovery: ON

Emergency:
- Mode: LEAD_ONLY
- Lead Capture: ON

Patch SHA256:
ee8b2624bb98fe3e392773d7cf2f267fb6e72b99f777b6c95f6ecaa9ac4c2195
