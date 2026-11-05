Ventic Pro V20I6 - Remote-Main Git Patch Installer

Why V20I6 exists:
Some local clones do not contain the tested V20H5 commit object because their Git history is shallow/incomplete.
V20I6 does NOT require that commit to exist locally.

Process:
1. Fetch origin/main.
2. Verify origin/main SHA is exactly:
   ee56d4721a42577097ac9ced741e7cd6e7c93a38
3. Back up only the target files.
4. Restore those target files from origin/main.
5. Apply the already-tested 3-way Git patch.
6. Stage the patch.
7. Run static checks and git diff --cached --check.
8. Roll back from backup if anything fails.

The patch itself was already tested in a Vercel sandbox:
- git apply --3way --index: clean
- customer account claim guard: PASS
- V20H guard: 52 Admin API routes PASS
- Prisma generate: PASS
- TypeScript: 0 errors
- git diff --cached --check: PASS
