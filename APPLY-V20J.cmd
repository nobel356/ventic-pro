@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20J FAILED: Could not locate the Ventic Pro Git repository.
  echo Put all V20J files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "EXPECTED=b31fca9178a979b5c04a11897942ee5e9a1973b7"
set "BACKUP=%REPO%\.v20j-backup-%RANDOM%%RANDOM%"

echo Fetching current Production main...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20J FAILED: Could not fetch origin/main.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo V20J FAILED: origin/main is not the tested V20I6 commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo Refusing to patch a different Production version.
  goto :fail
)

git diff --cached --quiet -- app/api/customer/auth/forgot-password/route.ts app/customer/forgot-password/page.tsx lib/customer-messaging.ts package.json scripts/security-dual-otp-check.mjs
if errorlevel 1 (
  echo V20J FAILED: One of the target files has staged changes.
  echo Commit or unstage those changes first.
  goto :fail
)

mkdir "%BACKUP%" >nul 2>&1
copy /Y "app\api\customer\auth\forgot-password\route.ts" "%BACKUP%\forgot-password.route.ts" >nul
copy /Y "app\customer\forgot-password\page.tsx" "%BACKUP%\forgot-password.page.tsx" >nul
copy /Y "lib\customer-messaging.ts" "%BACKUP%\customer-messaging.ts" >nul
copy /Y "package.json" "%BACKUP%\package.json" >nul
if exist "scripts\security-dual-otp-check.mjs" copy /Y "scripts\security-dual-otp-check.mjs" "%BACKUP%\security-dual-otp-check.mjs" >nul

echo Backup created:
echo %BACKUP%
echo.

echo Restoring only V20J target files from origin/main...
git restore --source=origin/main --staged --worktree -- app/api/customer/auth/forgot-password/route.ts app/customer/forgot-password/page.tsx lib/customer-messaging.ts package.json
if errorlevel 1 goto :rollback

if exist "scripts\security-dual-otp-check.mjs" del /Q "scripts\security-dual-otp-check.mjs"

echo Checking tested Git patch...
git apply --check "%~dp0V20J.patch"
if errorlevel 1 goto :rollback

echo Applying V20J Dual OTP patch...
git apply --3way --index "%~dp0V20J.patch"
if errorlevel 1 goto :rollback

findstr /C:"deliveryMethod" "app\customer\forgot-password\page.tsx" >nul
if errorlevel 1 goto :rollback

findstr /C:"preferredChannel" "lib\customer-messaging.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"security-dual-otp-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo V20J APPLIED SUCCESSFULLY
echo.
echo Added:
echo - OTP delivery choice: mobile or email
echo - Email uses the configured Resend provider
echo - Mobile uses the WhatsApp/SMS delivery path
echo - Explicit mobile choice does not silently fall back to email
echo - V20J regression guard runs on every Vercel build
echo.
echo The patch is already staged in Git.
echo Commit message:
echo V20J - dual OTP mobile and email
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20J verification failed. Restoring backup...

git reset HEAD -- app/api/customer/auth/forgot-password/route.ts app/customer/forgot-password/page.tsx lib/customer-messaging.ts package.json scripts/security-dual-otp-check.mjs >nul 2>&1

copy /Y "%BACKUP%\forgot-password.route.ts" "app\api\customer\auth\forgot-password\route.ts" >nul
copy /Y "%BACKUP%\forgot-password.page.tsx" "app\customer\forgot-password\page.tsx" >nul
copy /Y "%BACKUP%\customer-messaging.ts" "lib\customer-messaging.ts" >nul
copy /Y "%BACKUP%\package.json" "package.json" >nul

if exist "%BACKUP%\security-dual-otp-check.mjs" (
  copy /Y "%BACKUP%\security-dual-otp-check.mjs" "scripts\security-dual-otp-check.mjs" >nul
) else (
  if exist "scripts\security-dual-otp-check.mjs" del /Q "scripts\security-dual-otp-check.mjs"
)

echo Backup restored.
echo Backup folder:
echo %BACKUP%

:fail
echo.
echo No completed-change claim has been made.
pause
exit /b 1
