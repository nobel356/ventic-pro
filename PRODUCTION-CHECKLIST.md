# Ventic Pro — Production Checklist

## ضروري قبل النشر
- تشغيل `npm install`, `prisma generate`, migration و `npm run build` على بيئة CI/Deployment حقيقية.
- PostgreSQL production مع backups وSSL.
- تغيير كل secrets وكلمات المرور الافتراضية.
- ربط object storage حقيقي للصور مع signed uploads.
- ربط WhatsApp/SMS/Email provider للإشعارات وOTP.
- rate limiting على login وOTP وواجهات العميل.
- CSRF/origin checks للعمليات الحساسة، security headers وHTTPS فقط.
- اختبارات permissions لكل Role وكل API.
- اختبارات دورة الطلب: إنشاء → عرض سعر → موافقة → تعيين → تنفيذ → OTP → دفع → فاتورة → ضمان → تقييم.
- سياسة خصوصية وشروط خدمة وسياسة احتفاظ بالصور والبيانات.
- مراقبة الأخطاء والـlogs والنسخ الاحتياطي والاسترجاع.
- مراجعة الأسعار ومناطق الخدمة من الإدارة قبل الإطلاق.

## لا يُعتبر جاهزًا للإنتاج حتى تمر البنود السابقة.
