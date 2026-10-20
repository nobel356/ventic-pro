# Ventic Pro V18A — Global Navigation

حل مشكلة إن المستخدم يوصل لصفحة ويحس إنها طريق مسدود.

## الجديد

### 1) Global Menu
زر قائمة ثابت في كل صفحات الموقع العامة.

يفتح Drawer من اليمين يحتوي:
- الرئيسية
- اطلب تركيب
- أعمالنا
- الأسئلة الشائعة
- حساب العميل

### 2) الخدمات
داخل القائمة:
- تهوية الحمامات
- تهوية المطابخ
- هود وخطوط الطرد
- الصيانة وما بعد التركيب

### 3) زر رجوع
في كل صفحة داخلية يظهر زر رجوع ثابت.
لو مفيش History يرجع للرئيسية.

### 4) التواصل
داخل القائمة:
- WhatsApp
- اتصال مباشر
- رقم الهاتف

وما زال WhatsApp Floating Button موجود على Desktop.

### 5) Mobile Bottom Navigation
على الموبايل يظهر شريط ثابت:
- الرئيسية
- اطلب
- WhatsApp

بحيث المستخدم يقدر يتصرف من أي صفحة من غير ما يرجع لأعلى الصفحة.

### 6) Footer
تم إضافة روابط سريعة:
- اطلب تركيب
- أعمالنا
- FAQ
- حساب العميل

### 7) Admin / Technician
لا يتأثروا إطلاقًا.
الـGlobal public menu لا يظهر داخلهم.

## الملفات
- app/shared/SiteChrome.tsx
- app/navigation-v18.css
- app/layout.tsx

## التركيب
1. فك ZIP.
2. انسخ المحتويات فوق Root المشروع.
3. Replace / Merge.
4. Commit:
   `V18A - add global site navigation and contact drawer`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.
