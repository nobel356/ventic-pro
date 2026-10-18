# Ventic Pro V16I — Direct Presigned Upload

المشكلة:
حتى مع Uploader V16H والمسار الجديد، @vercel/blob/client رجّع نفس signed-token scope القديم.

الحل:
V16I يتخطى `@vercel/blob/client upload()` بالكامل.

## المسار الجديد
1. الصفحة تطلب من السيرفر Presigned PUT URL.
2. السيرفر نفسه يولد pathname آمن:
   `portfolio/<UUID>.mp4`
3. المتصفح يرفع الفيديو مباشرة إلى Blob باستخدام XHR.
4. Progress Bar يقرأ التقدم الحقيقي من `xhr.upload.onprogress`.
5. بعد النجاح يتم حفظ metadata في قاعدة البيانات.

## النتيجة
- لا يوجد handleUpload client-token flow للفيديوهات.
- لا يوجد اسم ملف عربي داخل Blob pathname.
- لا يوجد multipart client state قديم.
- نفس Private Blob Store الحالي.
- نفس حد 500 MB.

## الملفات
- `app/admin/work-videos/page.tsx`
- `app/api/admin/portfolio-videos/presign/route.ts`

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V16I - direct presigned portfolio video upload`
5. Push main.

بعد Deploy افتح:
`/admin/work-videos`

وتأكد من ظهور:
`Uploader V16I`

لا يوجد Migration.
لا توجد Env جديدة.
