# Upload Ventic Pro V13B with GitHub Desktop

This package is built on the current stable V13A main:
`d7373a05beb2f3d2740a55c149fb9ecfb9c0866b`

## Recommended GitHub Desktop steps

1. Open the local `ventic-pro` repository.
2. Fetch/Pull `main` first.
3. For safety, create a branch:
   `v13b-archive-expansion`
4. Extract this ZIP.
5. Copy the CONTENTS of `Ventic-Pro-V13B-Archive-Expansion` into the root of `ventic-pro`.
6. Allow folder merge and file replacement.
7. Review the changed files in GitHub Desktop.
8. Commit:
   `V13B - expand archive vault to customers leads suppliers inventory`
9. Push.

If you choose to deploy directly from main, the migration will run on Production immediately during Vercel build.

## Do not use prisma db push

Do not manually run:
`prisma db push`

The included migration should be applied by the existing production migration flow.

## Existing Vault password

Your current Archive Vault password remains valid.
No new password setup is needed.

## After deploy

Open `/admin/archive`, unlock the Vault, and use:
`➕ أرشفة عنصر`

See `V13B-NOTES.md` for safety rules and smoke tests.
