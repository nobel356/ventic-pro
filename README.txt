V13A TypeScript Fix 1

Replace these two files in your ventic-pro repository:

1) app/api/admin/archive/orders/[id]/route.ts
2) app/api/admin/archive/users/[id]/route.ts

Why:
Next.js TypeScript build does not preserve the earlier archivedAt null check inside Prisma transaction closures.
The fix uses a non-null assertion only at points already protected by an earlier runtime guard.

Commit message:
V13A - fix archive restore TypeScript null narrowing
