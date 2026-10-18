# Ventic Pro V16H — Fresh Uploader Route

الهدف:
إجبار Next.js والمتصفح على تحميل Client Bundle جديد تمامًا لصفحة رفع الفيديوهات.

## الجديد
- صفحة الرفع الجديدة:
  `/admin/work-videos`
- الرابط القديم:
  `/admin/portfolio-videos`
  يعمل Redirect تلقائي للجديد.
- القائمة الجانبية تشير للصفحة الجديدة.
- يظهر Badge داخل الصفحة:
  `Uploader V16H`

لو الـBadge ظاهر، يبقى أنت مؤكد على النسخة الجديدة.

## مسار التخزين
ما زال ASCII آمن:
`portfolio/<UUID>.mp4`

اسم الملف العربي لا يدخل إطلاقًا في pathname.

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V16H - force fresh portfolio uploader route`
5. Push main.

## بعد Deploy
افتح مباشرة:
`/admin/work-videos`

لا تستخدم Bookmark قديم.

لا يوجد Migration.
لا توجد Env جديدة.
