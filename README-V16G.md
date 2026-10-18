# Ventic Pro V16G — Cache Bust Hotfix

المشكلة:
الكود الحالي في main يستخدم UUID آمن للفيديوهات، لكن Service Worker القديم كان يحتفظ بملفات:
`/_next/static/`
بطريقة cache-first.

ده ممكن يخلي المتصفح يشغّل JavaScript قديم بعد Deploy جديد.

الإصلاح:
- تغيير اسم Cache من:
  `ventic-pro-v12k-public-v1`
  إلى:
  `ventic-pro-v16g-public-v1`
- حذف كل الكاشات القديمة عند activate.
- Next.js static chunks أصبحت Network-first.
- `/works` أضيفت للصفحات العامة المخزنة Offline.
- صفحات `/admin` و`/api` ما زالت خارج الكاش تمامًا.

التركيب:
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace.
4. Commit:
   `V16G - bust stale service worker cache`
5. Push main.

بعد Deploy:
- اقفل كل Tabs بتاعة Ventic Pro.
- افتح الموقع من جديد.
- اعمل Ctrl+Shift+R مرة واحدة على الكمبيوتر.
- جرّب رفع الفيديو من جديد.

لا يوجد Migration ولا Env.
