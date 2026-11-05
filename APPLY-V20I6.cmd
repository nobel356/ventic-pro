@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20I6 FAILED: Could not locate the Ventic Pro Git repository.
  echo Put all V20I6 files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "EXPECTED=ee56d4721a42577097ac9ced741e7cd6e7c93a38"
set "BACKUP=%REPO%\.v20i6-backup-%RANDOM%%RANDOM%"

git remote get-url origin >nul 2>&1
if errorlevel 1 (
  echo V20I6 FAILED: Git remote "origin" is missing.
  goto :fail
)

echo Fetching the tested Production branch from GitHub...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20I6 FAILED: Could not fetch origin/main.
  echo Check your internet/GitHub connection, then run again.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if not defined REMOTE_SHA (
  echo V20I6 FAILED: Could not resolve origin/main after fetch.
  goto :fail
)

echo Remote main:
echo %REMOTE_SHA%
echo.

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo V20I6 FAILED: origin/main is not the tested V20H5 Production commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo Refusing to overwrite a newer or different Production version.
  goto :fail
)

git diff --cached --quiet -- app/api/customer/auth/register/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/reset-password/route.ts package.json scripts/security-customer-claim-check.mjs
if errorlevel 1 (
  echo V20I6 FAILED: One of the target files has staged changes.
  echo Commit or unstage those changes first.
  goto :fail
)

mkdir "%BACKUP%" >nul 2>&1
copy /Y "app\api\customer\auth\register\route.ts" "%BACKUP%\register.route.ts" >nul
copy /Y "app\api\customer\auth\forgot-password\route.ts" "%BACKUP%\forgot-password.route.ts" >nul
copy /Y "app\api\customer\auth\reset-password\route.ts" "%BACKUP%\reset-password.route.ts" >nul
copy /Y "package.json" "%BACKUP%\package.json" >nul
if exist "scripts\security-customer-claim-check.mjs" copy /Y "scripts\security-customer-claim-check.mjs" "%BACKUP%\security-customer-claim-check.mjs" >nul

echo Backup created:
echo %BACKUP%
echo.

echo Restoring only the V20I target files from origin/main...
git restore --source=origin/main --staged --worktree -- app/api/customer/auth/register/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/reset-password/route.ts package.json
if errorlevel 1 goto :rollback

echo Checking tested Git patch...
git apply --check "%~dp0V20I6.patch"
if errorlevel 1 goto :rollback

echo Applying tested Git patch...
git apply --3way --index "%~dp0V20I6.patch"
if errorlevel 1 goto :rollback

copy /Y "%~dp0security-customer-claim-check.mjs" "scripts\security-customer-claim-check.mjs" >nul
if errorlevel 1 goto :rollback

git add scripts/security-customer-claim-check.mjs
if errorlevel 1 goto :rollback

findstr /C:"ACCOUNT_ACTIVATION_REQUIRED" "app\api\customer\auth\register\route.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"security-customer-claim-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo V20I6 APPLIED SUCCESSFULLY
echo.
echo Critical fix:
echo - Existing order customers cannot be claimed using only their phone number
echo - First password requires OTP verification
echo - Existing accounts still use normal login
echo - V20I6 regression guard runs during every Vercel build
echo.
echo The security patch is already staged in Git.
echo Commit message:
echo V20I6 - secure customer account claim
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20I6 verification failed. Restoring the backup...

git reset HEAD -- app/api/customer/auth/register/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/reset-password/route.ts package.json scripts/security-customer-claim-check.mjs >nul 2>&1

copy /Y "%BACKUP%\register.route.ts" "app\api\customer\auth\register\route.ts" >nul
copy /Y "%BACKUP%\forgot-password.route.ts" "app\api\customer\auth\forgot-password\route.ts" >nul
copy /Y "%BACKUP%\reset-password.route.ts" "app\api\customer\auth\reset-password\route.ts" >nul
copy /Y "%BACKUP%\package.json" "package.json" >nul

if exist "%BACKUP%\security-customer-claim-check.mjs" (
  copy /Y "%BACKUP%\security-customer-claim-check.mjs" "scripts\security-customer-claim-check.mjs" >nul
) else (
  if exist "scripts\security-customer-claim-check.mjs" del /Q "scripts\security-customer-claim-check.mjs"
)

echo Backup restored.
echo Backup folder:
echo %BACKUP%
goto :fail

:fail
echo.
echo No completed-security claim has been made.
pause
exit /b 1
