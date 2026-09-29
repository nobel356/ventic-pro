# Ventic Pro — Staging Runbook

1. انسخ `.env.example` إلى `.env` وغيّر `AUTH_SECRET`.
2. شغّل PostgreSQL: `docker compose up -d db`
3. ثبّت الحزم: `npm install`
4. شغّل: `npm run db:generate`
5. طبّق الـschema: `npm run db:push`
6. غيّر `SEED_ADMIN_PASSWORD` ثم: `npm run db:seed`
7. شغّل الفحص: `npm run check`
8. شغّل التطبيق: `npm run dev`
9. افتح `/api/health` وتأكد أن database = ok.
10. اختبر دورة طلب كاملة قبل ربط أي عميل حقيقي.

## بوابات الإطلاق
- Storage provider للصور: غير مربوط افتراضيًا.
- WhatsApp/SMS/Email: غير مربوط افتراضيًا.
- بوابة دفع إلكترونية: غير مربوطة افتراضيًا.
- يلزم rate limiting واختبارات أمنية قبل Production.
