# Ventic Pro V18B — Growth Essentials

الحزمة دي تنفذ أهم الحاجات اللي تقدر تتعمل الآن بدون دومين أو حسابات إعلانية خارجية.

## تم تنفيذ

### Callback / كلّمني
صفحة:
`/callback`

- الاسم
- الموبايل
- موافقة التواصل
- يدخل نفس Lead system الحالي
- Deduplication الحالي يظل شغال
- Admin Notification بعنوان `طلب اتصال جديد`
- يظهر في `/admin/leads`

### Smart WhatsApp
رسالة WhatsApp تتغير حسب الصفحة:
- الحمامات
- المطابخ
- الهود
- أعمالنا
- مناطق الخدمة
- الطلب
- حساب العميل

### Mobile Conversion Bar
على الموبايل:
- الرئيسية
- اطلب
- كلّمني
- WhatsApp

### صفحات الخدمات
تم إنشاء الصفحات التي كانت الروابط تشير إليها:
- `/services/bathroom-ventilation`
- `/services/kitchen-ventilation`
- `/services/hood-exhaust`

كل صفحة فيها:
- Metadata
- Service JSON-LD
- FAQ Schema
- CTA للطلب
- CTA للمكالمة
- CTA لأعمالنا

### مناطق الخدمة
صفحة:
`/areas`

تقرأ مباشرة من ServiceArea في قاعدة البيانات:
- المحافظة
- المنطقة
- رسوم الانتقال
- أيام الخدمة

## الملفات
- app/layout.tsx
- app/growth-v18b.css
- app/shared/GrowthAssist.tsx
- app/callback/page.tsx
- app/api/leads/route.ts
- app/services/ServiceLanding.tsx
- app/services/bathroom-ventilation/page.tsx
- app/services/kitchen-ventilation/page.tsx
- app/services/hood-exhaust/page.tsx
- app/areas/page.tsx

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V18B - add growth essentials and service landing pages`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.

## ملاحظة
هذه النسخة مبنية فوق V18A Global Navigation.
