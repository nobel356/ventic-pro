# Ventic Pro V17D — YouTube Only Hard Cut

الحل النهائي لفصل قسم أعمالنا عن Vercel Blob بالكامل.

## السبب الحقيقي
كان فيه Records قديمة من Vercel Blob في جدول PortfolioVideo.
مجرد فتح صفحة الإدارة كان الـAPI بيحاول يقرأها ويعمل Signed URL،
فكان خطأ Blob يظهر حتى وإنت بتستخدم YouTube فقط.

## التعديل
- لا يوجد أي import من @vercel/blob داخل Portfolio APIs.
- Admin API يقرأ فقط:
  blobPathname LIKE 'youtube:%'
- Public API يقرأ فقط فيديوهات YouTube.
- POST يقبل youtube: فقط.
- الحفظ Atomic Upsert:
  ON CONFLICT ("blobPathname") DO UPDATE
- PATCH وDELETE يتعاملوا مع YouTube فقط.
- Records القديمة من Blob تظل في الداتابيز لكن معزولة تمامًا ولا يتم لمسها.

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace.
4. Commit:
   V17D - hard cut portfolio to YouTube only
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.
