@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20I5 FAILED: Could not locate the Ventic Pro Git repository.
  echo Put these files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "BASE=ee56d4721a42577097ac9ced741e7cd6e7c93a38"
set "BACKUP=%REPO%\.v20i5-backup-%RANDOM%%RANDOM%"

git cat-file -e %BASE%^{commit} >nul 2>&1
if errorlevel 1 (
  echo V20I5 FAILED: Tested V20H5 base commit is not available locally.
  goto :fail
)

git merge-base --is-ancestor %BASE% HEAD >nul 2>&1
if errorlevel 1 (
  echo V20I5 FAILED: Current branch is not based on the tested V20H5 production commit.
  goto :fail
)

git diff --cached --quiet -- app/api/customer/auth/register/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/reset-password/route.ts package.json
if errorlevel 1 (
  echo V20I5 FAILED: One of the target files has staged changes.
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
echo Restoring only the 4 target files to the tested Production base...

git restore --source=%BASE% --staged --worktree -- app/api/customer/auth/register/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/reset-password/route.ts package.json
if errorlevel 1 goto :rollback

echo Checking Git patch...
git apply --check "%~dp0V20I5.patch"
if errorlevel 1 goto :rollback

echo Applying tested Git patch...
git apply --3way --index "%~dp0V20I5.patch"
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
echo V20I5 APPLIED SUCCESSFULLY
echo.
echo Critical fix:
echo - Existing order customers cannot be claimed using only their phone number
echo - First password requires OTP verification
echo - Existing accounts still use normal login
echo - V20I5 regression guard runs during every Vercel build
echo.
echo The patch is already staged in Git.
echo Commit message:
echo V20I5 - secure customer account claim
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20I5 verification failed. Restoring the backup...

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
