# Ventic Pro V17B — YouTube Duplicate Upsert

المشكلة:
نفس فيديو YouTube كان ممكن يتضاف مرتين، لكن `blobPathname` عليه Unique Index.
ده كان بيرجع PostgreSQL 23505.

الإصلاح:
- لو نفس `youtube:<videoId>` موجود:
  - لا يتم إنشاء Record جديد.
  - يتم تحديث الفيديو الموجود بالعنوان والوصف والمنطقة والخدمة والترتيب.
  - يتم تحديث موافقة العميل والنشر.
- لو الفيديو غير موجود:
  - يتم إنشاء Record جديد طبيعي.
- لا يوجد Migration.
- لا يتم إزالة الـUnique Index، وده مقصود لمنع تكرار نفس الفيديو مرتين.

Commit:
`V17B - upsert duplicate YouTube portfolio videos`
