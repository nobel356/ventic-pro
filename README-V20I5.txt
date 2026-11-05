Ventic Pro V20I5 - Git Patch Installer

This installer uses Git's own 3-way patch engine instead of PowerShell text replacement.

Tested against production base:
ee56d4721a42577097ac9ced741e7cd6e7c93a38

Sandbox verification completed:
- git apply --3way --index: clean
- V20I4 customer account claim guard: pass
- V20H route guard: 52 admin API routes pass
- Prisma generate: pass
- TypeScript tsc --noEmit: 0 errors
- git diff --cached --check: pass

The installer backs up the four target files before touching them and rolls them back if Git patch verification fails.
