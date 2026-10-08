# Ventic Pro V13A — Files to copy into your repo

This package is built for the V12K baseline:
`0092f031bbf73cd427a261b903615884c777df92`

## Using GitHub Desktop

1. Make sure your local `ventic-pro` repo is on `main` and up to date.
2. Recommended: create a new branch in GitHub Desktop named:
   `v13a-archive-vault`
3. Extract this ZIP.
4. Copy **the contents inside `Ventic-Pro-V13A-Archive-Vault`** into the root of your local `ventic-pro` folder.
5. Allow Windows/macOS to merge folders and replace files with the same names.
6. Open GitHub Desktop. You should see all V13A changes.
7. Commit with:
   `V13A - archive vault soft delete restore and audit`
8. Push the branch.
9. Let Vercel build the branch/commit.

## Do not manually run db push on production

Do NOT use:
`prisma db push`

Your existing Vercel build already runs the production migration workflow:
`prisma generate && node scripts/production-migrate.mjs && next build`

The included Prisma migration will be applied through `prisma migrate deploy`.

## After deployment

As Super Admin:
1. Go to `/admin/archive`.
2. Create the Archive Vault password.
3. Go to `/admin/users`.
4. Grant archive permissions only to the accounts you choose:
   - مشاهدة الأرشيف
   - نقل إلى الأرشيف
   - استرجاع من الأرشيف

Super Admin gets all three automatically.

## First test

Use test data first:
- archive one disposable order;
- restore it;
- archive one disposable staff user;
- restore it.

Do not start by archiving an important live order.

## What "delete" means now

The red archive action is reversible.
It does not hard-delete financial or operational history.

See `V13A-NOTES.md` for the full design and smoke test.
