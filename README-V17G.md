# Ventic Pro V17G — YouTube + TikTok Portfolio

## الجديد
قسم أعمالنا يدعم الآن:
- YouTube
- TikTok

## داخل لوحة الإدارة
`/admin/work-videos`

اختار مصدر الفيديو:
- YouTube
- TikTok

ثم:
1. ضع رابط الفيديو.
2. اكتب العنوان.
3. نوع الخدمة والمنطقة والوصف والترتيب.
4. حدد موافقة العميل.
5. اختر نشر فورًا أو مسودة.
6. احفظ.

## TikTok
يدعم الرابط الكامل:
`https://www.tiktok.com/@user/video/123456789...`

ويدعم محاولة حل روابط TikTok المختصرة تلقائيًا من خلال endpoint آمن لا يسمح إلا بنطاقات TikTok.

التشغيل يستخدم TikTok Embed Player الرسمي:
`https://www.tiktok.com/player/v1/{post_id}`

## الأمان
CSP يسمح فقط بإطارات:
- YouTube
- YouTube No-Cookie
- TikTok

## قاعدة البيانات
لا يوجد جدول جديد.
نستخدم نفس PortfolioVideo:
- `youtube:<id>`
- `tiktok:<id>`

ونفس Atomic Upsert يمنع التكرار.

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V17G - add TikTok portfolio videos`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.
