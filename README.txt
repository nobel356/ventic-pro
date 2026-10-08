V13A Runtime Fix 2

Replace:
lib/prisma.ts

Root cause fixed:
The archive visibility Prisma extension wrapped findUnique/update/delete/upsert `where`
inside AND. Prisma requires the unique selector (id/email/orderNo/etc.) to remain at
the top level for those operations. The server can therefore crash at runtime on
normal authentication/currentUser/findUnique calls.

This fix preserves the unique selector at top level and appends the archive guard
as an AND condition.

No database migration is needed.
The V13A migration has already been applied successfully.

Commit message:
V13A - fix Prisma archive unique where runtime guard
