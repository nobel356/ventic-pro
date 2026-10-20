# Ventic Pro V17A — YouTube Portfolio

الحل النهائي المقترح للفيديوهات.

## الاستخدام
1. ارفع الفيديو على YouTube.
2. خليه Public أو Unlisted.
3. انسخ اللينك.
4. افتح `/admin/work-videos`.
5. الصق اللينك وأدخل العنوان والخدمة والمنطقة والوصف.
6. فعل موافقة العميل.
7. فعل منشور.

## يدعم
- youtube.com/watch?v=
- youtu.be/
- youtube.com/shorts/
- youtube.com/live/
- Video ID مباشرة

## مهم
- لو مش عاوز الفيديو يظهر في بحث YouTube، استخدم Unlisted.
- ما تستخدمش Private لأن الـembed لن يعمل للعامة.
- الفيديوهات القديمة على Blob تظل مدعومة لو كانت موجودة.
- العرض يستخدم youtube-nocookie.com.

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V17A - switch portfolio videos to YouTube embeds`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.
