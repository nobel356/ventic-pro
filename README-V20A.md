# Ventic Pro V20A — Launch Readiness

هذه الحزمة تجهز الموقع لكل ما يمكن عمله قبل الدومين النهائي.

## ما تم تنفيذه

### Privacy / Consent
- Consent layer منفصلة لـ:
  - Analytics
  - Marketing
- ضروري فقط متاح.
- إعادة فتح إعدادات الخصوصية من الموقع.
- تحديث سياسة الخصوصية.
- Internal conversion tracking لا يعمل قبل Analytics consent.

### Google Tag Manager / GA4
- `NEXT_PUBLIC_GTM_ID`
- GTM هو المسار المفضل لإدارة GA4 + Meta + TikTok بدون Deploy جديد.
- Fallback مباشر لـGA4 عبر:
  `NEXT_PUBLIC_GA_MEASUREMENT_ID`
- أحداث Ventic الحالية تُدفع إلى `dataLayer` باسم:
  `ventic_<event>`

### Microsoft Clarity
- دعم:
  `NEXT_PUBLIC_CLARITY_PROJECT_ID`
- لا يتم تحميله إلا بعد موافقة Analytics.

### Search verification readiness
- Google:
  `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`
- Bing:
  `NEXT_PUBLIC_BING_SITE_VERIFICATION`
- الدومين وSearch Console Domain property يظلان آخر خطوة.

### Monitoring
- Public health endpoint:
  `/api/health`
- يصلح لـUptimeRobot / Better Stack / أي monitor خارجي.
- لا يعرض Secrets.

### Launch Center
Super Admin:
`/admin/launch-center`

يعرض حالة:
- GTM
- GA4
- Clarity
- SEO verification
- Domain
- WhatsApp
- SMS
- Email
- Google Reviews
- Health endpoint
- Security / system monitoring

### Social sharing
- OpenGraph image ديناميكية.
- Twitter large image.

### CSP
السماح فقط بمصادر scripts اللازمة عند تفعيل:
- Google Tag Manager
- Google Analytics
- Microsoft Clarity
- Meta
- TikTok

## Env الجديدة الاختيارية

NEXT_PUBLIC_GTM_ID=
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_CLARITY_PROJECT_ID=
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=
NEXT_PUBLIC_BING_SITE_VERIFICATION=

موجود مسبقًا ومفيد:
NEXT_PUBLIC_GOOGLE_REVIEW_URL=

## ترتيب الحسابات الخارجية قبل الدومين

1. Google Tag Manager
2. GA4 Web Stream
3. Microsoft Clarity
4. Meta Pixel داخل GTM
5. TikTok Pixel داخل GTM
6. Google Business Profile + Review link
7. WhatsApp Cloud / Twilio / Resend completion
8. Uptime monitor على `/api/health`

## آخر خطوة فقط
1. شراء/ربط الدومين
2. تحديث `NEXT_PUBLIC_APP_URL`
3. Search Console Domain property (DNS verification)
4. Sitemap submission
5. Request indexing للصفحة الرئيسية
6. Core Web Vitals + SEO audit على الدومين النهائي

## لا يوجد
- Prisma migration
- dependency جديدة

Commit:
`V20A - launch readiness consent analytics seo monitoring`
