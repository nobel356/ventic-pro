# Ventic Pro V13E — READY COPY

دي النسخة الجاهزة اللي طلبتها:
- مفيش Node محلي.
- مفيش PowerShell.
- مفيش CMD.
- مفيش Patch script.
- مفيش أي خطوة تشغيل قبل الـCommit.

## التركيب

1. افتح فولدر مشروع `ventic-pro`.
2. فك الـZIP.
3. افتح فولدر:
   `Ventic-Pro-V13E-READY-COPY`
4. انسخ **المحتويات اللي جواه** إلى Root مشروع `ventic-pro`.
5. وافق على Replace / Merge.
6. افتح GitHub Desktop.
7. راجع الملفات.
8. Commit:
   `V13E - ready copy bulk archive and true hard delete`
9. Push على `main`.

## الملفات دي Replacement كاملة

الـZIP يحافظ على نفس Folder Structure، بما في ذلك:
`app/api/admin/archive/purge/[type]/[id]/route.ts`

مافيش أي مشكلة مع `[id]` لأنك مش هتشغل سكربت على ويندوز؛ إنت بس هتنسخ الفولدرات والملفات.

## الجديد

### الأرشفة بدون سبب
الأزرار الرئيسية للأرشفة لم تعد تسأل عن سبب.
داخليًا يتم إرسال `بدون سبب` فقط للتوافق مع API القديم.

### اختيار متعدد في الصفحات الرئيسية
في الصفحات:
- Orders
- Technicians
- Customers
- Leads
- Purchases / Suppliers
- Inventory
- Users

هتلاقي زر عائم:
`☑ إدارة متعددة`

يفتح Panel فيها:
- Search
- Checkboxes
- تحديد الكل الظاهر
- أرشفة المحدد

### Users
زر الأرشفة القديم اللي كان بيسأل عن سبب بيتم إخفاؤه في شاشة Users.
الأرشفة هناك تتم من `إدارة متعددة` من غير سبب.

### Archive Vault
الـTab القديم `➕ أرشفة عنصر` اللي كان بيسأل عن سبب بيتم إخفاؤه.
الأرشفة تكون من الشاشات التشغيلية الرئيسية.

### Archive Vault — Multi-select
جوه الأرشيف:
- تحديد متعدد
- تحديد الكل
- استرجاع المحدد
- حذف المحدد نهائيًا

### الحذف النهائي
Super Admin + Archive Vault مفتوح + كتابة:
`حذف نهائي`

الحذف لم يعد يرفض لمجرد وجود تاريخ مرتبط.

#### Order
يمسح:
- الطلب
- الفاتورة والمدفوعات والعروض والتقديرات والإضافات التابعة عبر علاقات DB
- الصيانة والشكاوى والضمان
- الصور/Attachments
- ملفات الصور من Vercel Blob
- مواعيد الفني
- حركات المخزون المرتبطة بالطلب
- الإشعارات
- أجهزة التركيب الناتجة من الطلب
- Log المرتبط مباشرة بالطلب
- يفصل Lead المحول قبل حذف الطلب

#### Customer
يمسح:
- كل Orders التابعة باستخدام نفس مسار الحذف الكامل
- الصور الفعلية للطلبات من Blob
- Notifications
- Properties / Devices
- Sessions / Password reset data
- العميل

#### User / Technician
يمسح الحساب والجلسات، ويزيل/يفصل مراجع المستخدم من السجلات الأخرى قبل الحذف حتى لا تمنع Foreign Keys العملية.
AuditLog يحتفظ باسم المنفذ التاريخي `actorLabel` لكن يتم فصل `actorId` عند حذف المستخدم.

#### Supplier
يمسح التوريدات التابعة وسطورها وحركات المخزون المرتبطة بالتوريدات ثم المورد.

#### Inventory item
يمسح:
- Movements
- Stocktake lines
- Purchase lines
- الصنف
ويعيد حساب إجمالي Purchase Receipt لو كان الصنف جزءًا من توريد قديم.

#### Lead
يمسح نهائيًا.

بعد كل Permanent Delete يتم إنشاء AuditLog جديد:
`ARCHIVE_PERMANENT_DELETE`

## Database

V13E READY COPY:
- لا تحتوي Migration جديدة.
- تعتمد على V13D الموجود حاليًا.
- لا تشغل `prisma db push`.

## أول اختبار بعد Deploy

استخدم بيانات تجريبية أولًا:
1. Leads → إدارة متعددة → اختار 2 → أرشفة المحدد.
2. Archive Vault → افتح كلمة السر.
3. حدد الاتنين → حذف المحدد نهائيًا.
4. Refresh وتأكد إنهم اختفوا.
5. جرّب Order تجريبي فيه صورة، ثم حذفه نهائيًا.
6. راقب Vercel build/runtime قبل استخدام الحذف على بيانات حقيقية.

الحذف النهائي غير قابل للاسترجاع.
