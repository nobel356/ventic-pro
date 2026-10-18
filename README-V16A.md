# Ventic Pro V16A — Portfolio Videos READY COPY

ميزة كاملة لرفع وعرض فيديوهات تنفيذ العملاء.

## النتيجة
- Super Admin يقدر يدخل:
  `/admin/portfolio-videos`
- أو يستخدم زر `🎬 فيديوهات الأعمال` داخل لوحة الإدارة.
- يرفع فيديو مباشر إلى Vercel Blob.
- يضيف:
  - عنوان
  - نوع الخدمة
  - المنطقة
  - وصف
  - ترتيب
- يحدد موافقة العميل.
- ينشر أو يخفي الفيديو.
- يقدر يعدل أو يحذف الفيديو نهائيًا.

## في الموقع العام
الفيديوهات المنشورة تظهر تلقائيًا في Homepage قبل الـFooter.
لو العدد أكثر من 4 يظهر رابط:
`كل الأعمال`
وصفحة:
`/works`

## خصوصية العميل
لا يمكن نشر فيديو إلا لو:
`موافقة العميل = مفعلة`

## التخزين
الفيديو لا يدخل GitHub.
الرفع يتم مباشرة من المتصفح إلى Vercel Blob لتفادي حدود Serverless upload.

## الصيغ
- MP4
- MOV
- WebM
- حتى 500 MB للفيديو

الأفضل دائمًا:
`MP4 H.264`
لأعلى توافق بين iPhone / Safari / Chrome / Windows.

## التركيب
1. Pull أحدث `main`.
2. فك ZIP.
3. انسخ **محتويات**:
   `Ventic-Pro-V16A-Portfolio-Videos-READY-COPY`
   إلى Root مشروع `ventic-pro`.
4. Replace / Merge.
5. GitHub Desktop.
6. Commit:
   `V16A - customer project video portfolio`
7. Push `main`.

## قاعدة البيانات
يوجد Migration جديد:
`20261018223000_portfolio_videos`

سيتم تطبيقه تلقائيًا من build الحالي للمشروع قبل Next build.

لا تستخدم `prisma db push`.

## بعد Deploy
1. Login Super Admin.
2. افتح `/admin/portfolio-videos`.
3. ارفع فيديو واحد تجريبي.
4. فعل موافقة العميل.
5. فعل منشور.
6. افتح Homepage وتأكد من التشغيل على iPhone والكمبيوتر.
