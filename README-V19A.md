# Ventic Pro V19A — Growth & Quality Suite

حزمة واحدة تنفذ الـ18 Upgrade المطلوبة فوق Ventic Pro الحالي.

## 1) Price Calculator
- `/calculator`
- الأسعار تُقرأ مباشرة من جدول `Service`.
- يدعم الكمية وخط الطرد بالمتر.
- يعرض From/To عند وجود Range.
- CTA مباشر للطلب أو Callback.
- يسجل `calculator_view` و`calculator_estimate` داخليًا.

## 2) Technical SEO
- `app/sitemap.ts`
- `app/robots.ts`
- Canonical في الصفحات الجديدة وصفحات الخدمات/المناطق.
- Organization/HomeAndConstructionBusiness JSON-LD محسّن.
- Service Schema + FAQ Schema.
- Sitemap ديناميكي لمناطق الخدمة.

## 3) 404 / Error UX
- `app/not-found.tsx`
- `app/error.tsx`
- لا توجد Dead End: رجوع للرئيسية، الطلب، Callback.

## 4) Why Ventic Pro
- `/why-ventic`
- صفحة ثقة ومبيعات تشرح الرحلة، الموافقات، الفاتورة والضمان والمتابعة.

## 5) Stronger Service Pages
- الحمامات
- المطابخ
- الهود وخطوط الطرد
- أسعار حية من DB.
- ما يشمل الخدمة / ما قد يحتاج تكلفة إضافية.
- خطوات التنفيذ، FAQ، CTA للحاسبة/الطلب/الأعمال/Callback.

## 6) Internal Conversion Tracking
- `/api/marketing/events`
- `/admin/conversions`
- `AuditLog` بدل إنشاء جدول إضافي.
- Events: page view, order intent, callback, WhatsApp, calculator, works, offers, referral.
- Event detail يمنع PII مثل الاسم والموبايل والإيميل والعنوان والـOTP والـtokens.
- Rate limit حسب IP.

## 7) Lead Recovery
- `/admin/lead-recovery`
- ترتيب Priority تلقائي.
- HOT leads.
- Callback leads.
- آخر نشاط، الخطوة، الخدمة، المصدر، وموافقة التواصل.

## 8) Global Trust Bar
- فاتورة موثقة.
- ضمان ومتابعة.
- موافقة قبل أي تكلفة إضافية.
- حساب عميل لكل الطلبات.

## 9) Public Offers
- `/offers`
- يعرض الكوبونات الفعالة داخل تاريخ الصلاحية وغير المستنفدة.
- CTA مباشر للطلب.

## 10) Works Upgrade
- `/works`
- Filters: YouTube/TikTok + الخدمة + المنطقة.
- Click-to-play بدل تحميل كل iframe مرة واحدة.
- CTA `عاوز تنفيذ مشابه` تحت كل مشروع.

## 11) Local SEO
- `/areas/[governorate]/[area]`
- الصفحات تتولد من `ServiceArea`.
- رسوم انتقال + أيام خدمة + Local Schema + CTA.

## 12) Performance Cleanup
- فيديوهات الأعمال أصبحت click-to-play / lazy.
- تقليل تحميل YouTube/TikTok embeds وقت فتح الصفحة.
- صفحات البيانات العامة تعتمد على APIs/Server queries صغيرة ومحددة.

## 13) Accessibility
- Skip link.
- Focus-visible واضح.
- Reduced-motion support.
- Touch/input sizing مناسب للموبايل.
- ARIA/labels في المكونات الجديدة.

## 14) Security Audit
- `/admin/security-audit`
- Super Admin فقط.
- يفحص: AUTH_SECRET length، HTTPS، CSP، Same-site mutations، Rate limits، PII-safe tracking، Referral cookie، QR، Google Review readiness.
- لا يعرض Secrets.

## 15) Referral System
- `/admin/referrals`
- `/ref/CODE`
- كود إحالة + خصم ثابت أو نسبة + Max Uses + Owner + Benefit.
- HttpOnly referral cookie لمدة 30 يوم.
- الخصم لا يتجمع مع Coupon آخر.
- الخصم يُكتب في Snapshot المالي ويستمر للمقايسة والفاتورة.
- Redemption tracking في AuditLog.
- Reward settlement tracking: Uses / Rewarded Uses + زر تسجيل صرف المكافأة.

## 16) QR
- QR Quick Access يظهر تلقائيًا في:
  - الفاتورة
  - الضمان
  - تفاصيل الطلب
- صفحة تفاصيل طلب عميل جديدة:
  `/customer/account/orders/[orderId]`
- QR يحتوي URL فقط؛ الوصول للصفحات يظل محميًا بـCustomer Session.
- في صفحة الضمان يظهر QR إضافي لتفاصيل الطلب.

## 17) Growth Dashboard
- `/admin/growth-dashboard`
- آخر 30 يوم:
  - Leads
  - Lead conversion
  - Orders
  - Completion rate
  - Callback requests
  - Registered value
  - Collected value
  - WhatsApp clicks
  - Calculator usage
  - Referral uses
  - Top services

## 18) Better Post-Service Feedback
- سؤال: `هل ترشح Ventic Pro لحد تعرفه؟`
- Public review consent موجود.
- Recommendation محفوظ في AuditLog مع التقييم.
- بعد تقييم 4-5 نجوم + Recommend = Yes يظهر Google Review CTA تلقائيًا إذا تم ضبط:
  `NEXT_PUBLIC_GOOGLE_REVIEW_URL`
- الـEnv اختياري ولا يمنع التشغيل.

# إضافات V19A في Navigation
- حاسبة السعر.
- العروض.
- ليه Ventic Pro؟
- مناطق الخدمة.
- Callback وSmart WhatsApp مستمرين.

# Database
**لا يوجد Prisma Migration في V19A.**
تم الاعتماد على `AuditLog` الموجود لـConversion + Referral state/rewards، لتقليل مخاطر Production migration.

# Environment
لا يوجد Env إجباري جديد.
اختياري فقط:

`NEXT_PUBLIC_GOOGLE_REVIEW_URL=https://...`

# QR
QR rendering يستخدم HTTPS QR image endpoint ويحتوي URL الصفحة فقط. صفحات العميل نفسها ما زالت تحتاج تسجيل الدخول.

# Install
1. فك ZIP.
2. انسخ محتويات الفولدر الداخلي فوق Root المشروع.
3. Replace / Merge.
4. Commit:

`V19A - growth quality suite 18 upgrades`

5. Push على `main`.
6. تأكد أن Vercel Build ينجح ثم نفذ Regression Checklist.

# Rollback
Rollback commit V19A يعيد النظام لما قبل الحزمة لأن V19A لا يضيف migration أو schema destructive changes.
