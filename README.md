V11.8 GitHub deployment enabled.
# Ventic Pro V11 — Staging Foundation

هذه النسخة تركز على تثبيت وتشغيل المشروع بدل إضافة Features جديدة.

## الجديد
- Docker Compose لـ PostgreSQL.
- Dockerfile للتطبيق.
- `.env.example` واضح بدون secrets حقيقية.
- `/api/health` لفحص التطبيق وقاعدة البيانات.
- Prisma seed لإنشاء Super Admin وخدمات البداية.
- أوامر `typecheck`, `check`, `db:generate`, `db:push`, `db:seed`.
- Security headers middleware.
- `STAGING.md` بخطوات التشغيل.
- `V11-READINESS.md` بنتيجة الفحص الساكن وحدوده.
- يحتفظ بوظائف V6–V10.

## تشغيل سريع
```bash
cp .env.example .env
docker compose up -d db
npm install
npm run db:generate
npm run db:push
SEED_ADMIN_PASSWORD='ضع-كلمة-مرور-قوية' npm run db:seed
npm run check
npm run dev
```

> مهم: Storage/Messaging/Online Payments غير موصولة بمزود خارجي افتراضيًا، وبالتالي لا يجب اعتبار النسخة Production-ready قبل ربطها واختبارها.

راجع `STAGING.md` و`PRODUCTION-CHECKLIST.md`.
