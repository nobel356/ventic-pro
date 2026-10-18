# Ventic Pro V16C — Private Blob Upload Fix

دي نسخة إصلاح لرفع فيديوهات الأعمال.

## السبب
المشروع الحالي يستخدم Vercel Blob Private للملفات الموجودة:
`lib/storage.ts -> access: "private"`

لكن V16A/V16B كانوا بيرفعوا فيديو Portfolio بـ:
`access: "public"`

ده يقدر يمنع client upload من بدء عملية الرفع على نفس الـBlob Store.

## الإصلاح
### Upload
- الفيديو يترفع الآن بـ:
  `access: "private"`
- `multipart: true`
- Progress حقيقي عبر `onUploadProgress`
- قبل بداية الـProgress يظهر:
  `جاري تجهيز تصريح الرفع...`
- لو token فشل، يظهر Error بدل ما المستخدم يحس إن الزر مش بيعمل حاجة.

### عرض الفيديو
لأن الفيديو Private:
- لا نستخدم الرابط الخام للعامة.
- API يولد Signed GET URL لمدة ساعة.
- نفس الشيء لPreview داخل Admin.
- الفيديو نفسه يتدفق مباشرة من Blob، وليس عبر Serverless Function.

## الملفات
- `app/api/admin/portfolio-videos/upload/route.ts`
- `app/api/admin/portfolio-videos/route.ts`
- `app/api/portfolio-videos/route.ts`
- `app/admin/portfolio-videos/page.tsx`

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V16C - fix portfolio private blob uploads`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.

## الاختبار
بعد Deploy:
1. Login Super Admin.
2. `/admin/portfolio-videos`
3. اختار فيديو MP4 صغير أولًا، مثلاً 10-30 MB.
4. اضغط رفع.
5. المفروض تشوف:
   - جاري تجهيز تصريح الرفع...
   - جاري رفع الفيديو 1%...
   - النسبة تتحرك
   - 100%
   - جاري حفظ البيانات
   - نجاح

بعدها جرّب فيديو أكبر.

## ملاحظة
لو ظهر:
`تعذر الحصول على تصريح الرفع`
ابعت Screenshot للرسالة، لأنها وقتها هتكون مشكلة Token/Store Configuration وليست Progress UI.
