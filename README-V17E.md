# Ventic Pro V17E — YouTube Embed CSP Fix

سبب رسالة:
`This content is blocked. Contact the site owner to fix the issue.`

كان Content-Security-Policy يمنع أي iframe خارجي لأن:
`default-src 'self'`
ومفيش `frame-src` ليوتيوب.

التعديل:
أضفنا فقط:
`frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com`

وده يسمح بعرض YouTube embeds بدون فتح مصادر iframe عشوائية.

التركيب:
1. فك ZIP.
2. انسخ `middleware.ts` فوق الملف الحالي.
3. Replace.
4. Commit:
   `V17E - allow YouTube embeds in CSP`
5. Push main.

لا يوجد Migration.
لا توجد Env جديدة.
