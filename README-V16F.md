# Ventic Pro V16F — ASCII Blob Path Hotfix

المشكلة:
Vercel Blob كان بيرفض بعض أسماء الفيديوهات العربية بسبب اختلاف Encoding بين signed token وpathname الفعلي.

الإصلاح:
- اسم الملف الأصلي لم يعد يدخل في Blob pathname.
- التخزين يستخدم UUID + extension إنجليزي فقط.
- مثال:
  portfolio/550e8400-e29b-41d4-a716-446655440000.mp4
- اسم الفيديو العربي يظل ظاهر عند اختيار الملف، لكنه لا يدخل في مسار التخزين.

التركيب:
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   V16F - use ascii blob paths for portfolio videos
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.
