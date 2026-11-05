@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20N FAILED: Could not locate the Ventic Pro Git repository.
  echo Put all V20N files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "EXPECTED=8dff8d1a5059dd759806aa6c88f55e867b4959c3"
set "BACKUP=%REPO%\.v20n-backup-%RANDOM%%RANDOM%"

echo Fetching current Production main...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20N FAILED: Could not fetch origin/main.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo V20N FAILED: origin/main is not the tested V20M Production commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo Refusing to patch a different Production version.
  goto :fail
)

git diff --cached --quiet -- app/api/admin/archive/forgot-password/route.ts app/api/admin/archive/orders/[id]/route.ts app/api/admin/archive/reset-password/route.ts app/api/admin/archive/unlock/route.ts app/api/admin/archive/users/[id]/route.ts package.json scripts/security-archive-vault-check.mjs
if errorlevel 1 (
  echo V20N FAILED: One of the target files has staged changes.
  goto :fail
)

mkdir "%BACKUP%" >nul 2>&1
copy /Y "app\api\admin\archive\forgot-password\route.ts" "%BACKUP%\forgot-password.route.ts" >nul
copy /Y "app\api\admin\archive\orders\[id]\route.ts" "%BACKUP%\orders.route.ts" >nul
copy /Y "app\api\admin\archive\reset-password\route.ts" "%BACKUP%\reset-password.route.ts" >nul
copy /Y "app\api\admin\archive\unlock\route.ts" "%BACKUP%\unlock.route.ts" >nul
copy /Y "app\api\admin\archive\users\[id]\route.ts" "%BACKUP%\users.route.ts" >nul
copy /Y "package.json" "%BACKUP%\package.json" >nul
if exist "scripts\security-archive-vault-check.mjs" copy /Y "scripts\security-archive-vault-check.mjs" "%BACKUP%\security-archive-vault-check.mjs" >nul

echo Backup created:
echo %BACKUP%
echo.

echo Restoring V20N tracked target files from origin/main...
git restore --source=origin/main --staged --worktree -- app/api/admin/archive/forgot-password/route.ts app/api/admin/archive/orders/[id]/route.ts app/api/admin/archive/reset-password/route.ts app/api/admin/archive/unlock/route.ts app/api/admin/archive/users/[id]/route.ts package.json
if errorlevel 1 goto :rollback

if exist "scripts\security-archive-vault-check.mjs" del /Q "scripts\security-archive-vault-check.mjs"

echo Checking tested Git patch...
git apply --check "%~dp0V20N.patch"
if errorlevel 1 goto :rollback

echo Applying V20N Archive Vault Integrity patch...
git apply --3way --index "%~dp0V20N.patch"
if errorlevel 1 goto :rollback

findstr /C:"security-archive-vault-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

findstr /C:"durableRateLimit" "app\api\admin\archive\unlock\route.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"archive-reset-submit:" "app\api\admin\archive\reset-password\route.ts" >nul
if errorlevel 1 goto :rollback

if not exist "scripts\security-archive-vault-check.mjs" goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo V20N APPLIED SUCCESSFULLY
echo.
echo Archive security hardening added:
echo - Order archive now requires unlocked Archive Vault
echo - User archive now requires unlocked Archive Vault
echo - Restore flows remain permission + vault protected
echo - Archive Vault unlock brute-force protection is durable in PostgreSQL
echo - Recovery request limiter is durable in PostgreSQL
echo - Recovery submit now has a durable limiter
echo - Permanent purge remains Super Admin + unlocked-vault only
echo - Build-time regression guard added
echo.
echo The patch is already staged in Git.
echo Commit message:
echo V20N - archive vault integrity lockdown
echo.
echo IMPORTANT:
echo Do NOT commit any .v20*-backup-* folders.
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20N verification failed. Restoring backup...

git reset HEAD -- app/api/admin/archive/forgot-password/route.ts app/api/admin/archive/orders/[id]/route.ts app/api/admin/archive/reset-password/route.ts app/api/admin/archive/unlock/route.ts app/api/admin/archive/users/[id]/route.ts package.json scripts/security-archive-vault-check.mjs >nul 2>&1

copy /Y "%BACKUP%\forgot-password.route.ts" "app\api\admin\archive\forgot-password\route.ts" >nul
copy /Y "%BACKUP%\orders.route.ts" "app\api\admin\archive\orders\[id]\route.ts" >nul
copy /Y "%BACKUP%\reset-password.route.ts" "app\api\admin\archive\reset-password\route.ts" >nul
copy /Y "%BACKUP%\unlock.route.ts" "app\api\admin\archive\unlock\route.ts" >nul
copy /Y "%BACKUP%\users.route.ts" "app\api\admin\archive\users\[id]\route.ts" >nul
copy /Y "%BACKUP%\package.json" "package.json" >nul

if exist "%BACKUP%\security-archive-vault-check.mjs" (
  copy /Y "%BACKUP%\security-archive-vault-check.mjs" "scripts\security-archive-vault-check.mjs" >nul
) else (
  if exist "scripts\security-archive-vault-check.mjs" del /Q "scripts\security-archive-vault-check.mjs"
)

echo Backup restored.
echo Backup folder:
echo %BACKUP%

:fail
echo.
echo No completed-security claim has been made.
pause
exit /b 1
