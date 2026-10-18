# Ventic Pro V16B — Upload Progress + Scroll Fix

## 1) Upload Progress
صفحة:
`/admin/portfolio-videos`

دلوقتي أثناء رفع الفيديو هتشوف:
- اسم الملف
- حجم الملف
- نسبة الرفع %
- Progress bar
- الزر نفسه يعرض النسبة

تم تفعيل:
- `onUploadProgress`
- `multipart: true`

وده أفضل للفيديوهات الكبيرة واستكمال الأجزاء/retries.

## 2) Desktop Scroll Fix
تم إلغاء تأثير scroll lock/overscroll القديم على الكمبيوتر.

الـ document يرجع:
- `overflow-y: auto`
- normal mouse wheel scroll
- بدون تثبيت ارتفاع body

## 3) Admin Bottom Fix
صفحة الإدارة دلوقتي:
- تكبر طبيعي مع المحتوى
- فيها bottom padding
- آخر جزء من الصفحة مش بيتاكل
- تقدر تعمل scroll للآخر

## الملفات
- `app/layout.tsx`
- `app/scroll-fix.css`
- `app/admin/portfolio-videos/page.tsx`

## التركيب
1. فك ZIP.
2. انسخ **محتويات** الفولدر فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V16B - upload progress and desktop admin scroll fix`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.

## اختبار سريع بعد Deploy
### الكمبيوتر
- Homepage: mouse wheel up/down
- Admin dashboard: scroll للآخر
- `/admin/portfolio-videos`: scroll للآخر

### الرفع
ارفع فيديو كبير نسبيًا وتأكد إن النسبة تتحرك:
0% → 25% → 60% → 100%
ثم تظهر رسالة حفظ البيانات.
