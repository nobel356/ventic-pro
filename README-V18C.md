# Ventic Pro V18C — Callback Build Hotfix

Fixes Next.js 15 build error on /callback.

- Removes useSearchParams() from the page client component.
- page.tsx becomes a server component.
- searchParams is read on the server.
- Interactive form moved to CallbackClient.tsx.
- No migration.
- No env changes.

Commit:
V18C - fix callback prerender build
