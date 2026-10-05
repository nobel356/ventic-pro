# Ventic Pro V12B.1 — Customer Order Photos

No Prisma schema change is required because AttachmentKind already contains CUSTOMER.

What this patch adds:
- Customer room photos selected during the order form are kept per room (bathroom/kitchen).
- After the order is successfully created, the server returns a short-lived signed upload token.
- The browser compresses large images before upload.
- Customer photos upload directly to the existing Private Vercel Blob store.
- The upload token is bound to one order and expires after 30 minutes.
- Maximum: 4 selected photos per room, 40 stored customer photos per order.
- Attachments are stored as kind CUSTOMER.
- Each file name is prefixed with the room label, such as حمام 1 or مطبخ 1.
- Admin order details show customer photos.
- Technician/admin execution workspace shows customer photos before the visit.
- Photos still open only through the authenticated secure attachment route.

Test:
1. Create a new order and select photos inside at least one bathroom/kitchen.
2. Confirm the order.
3. The success message should report how many photos were uploaded.
4. Open Admin > order details and confirm the customer-photo links appear.
5. Open Execute Order / technician execution and confirm "صور العميل قبل الزيارة" appears.
6. Vercel Blob storage usage should increase.
