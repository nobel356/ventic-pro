@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20M FAILED: Could not locate the Ventic Pro Git repository.
  echo Put all V20M files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "EXPECTED=a48af8b7f93c8191daf788c9b6e694124cda3156"
set "BACKUP=%REPO%\.v20m-backup-%RANDOM%%RANDOM%"

echo Fetching current Production main...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20M FAILED: Could not fetch origin/main.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo V20M FAILED: origin/main is not the tested V20L Production commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo Refusing to patch a different Production version.
  goto :fail
)

git diff --cached --quiet -- app/api/technician/orders/[id]/status/route.ts lib/order-execution.ts package.json scripts/security-execution-integrity-check.mjs
if errorlevel 1 (
  echo V20M FAILED: One of the target files has staged changes.
  goto :fail
)

mkdir "%BACKUP%" >nul 2>&1
copy /Y "app\api\technician\orders\[id]\status\route.ts" "%BACKUP%\technician-status.route.ts" >nul
copy /Y "lib\order-execution.ts" "%BACKUP%\order-execution.ts" >nul
copy /Y "package.json" "%BACKUP%\package.json" >nul
if exist "scripts\security-execution-integrity-check.mjs" copy /Y "scripts\security-execution-integrity-check.mjs" "%BACKUP%\security-execution-integrity-check.mjs" >nul

echo Backup created:
echo %BACKUP%
echo.

echo Restoring V20M tracked target files from origin/main...
git restore --source=origin/main --staged --worktree -- app/api/technician/orders/[id]/status/route.ts lib/order-execution.ts package.json
if errorlevel 1 goto :rollback

if exist "scripts\security-execution-integrity-check.mjs" del /Q "scripts\security-execution-integrity-check.mjs"

echo Checking tested Git patch...
git apply --check "%~dp0V20M.patch"
if errorlevel 1 goto :rollback

echo Applying V20M Execution Integrity patch...
git apply --3way --index "%~dp0V20M.patch"
if errorlevel 1 goto :rollback

findstr /C:"ORDER_NOT_IN_PROGRESS" "lib\order-execution.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"OTP_ATTEMPTS_EXCEEDED" "lib\order-execution.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"nextStatusByCurrent" "app\api\technician\orders\[id]\status\route.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"security-execution-integrity-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

if not exist "scripts\security-execution-integrity-check.mjs" goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo V20M APPLIED SUCCESSFULLY
echo.
echo Workflow protection added:
echo - Completion OTP only when order is IN_PROGRESS
echo - Cancelled/earlier-stage orders cannot be completed through execution flow
echo - Technician status progression is strictly ASSIGNED ^> ON_THE_WAY ^> ARRIVED ^> IN_PROGRESS
echo - Completion OTP issue limited to 10 per order/hour
echo - OTP attempts limited per actor and per order using durable PostgreSQL limits
echo - Successful OTP completion clears attempt buckets
echo - Build-time regression guard added
echo.
echo The patch is already staged in Git.
echo Commit message:
echo V20M - execution integrity lockdown
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20M verification failed. Restoring backup...

git reset HEAD -- app/api/technician/orders/[id]/status/route.ts lib/order-execution.ts package.json scripts/security-execution-integrity-check.mjs >nul 2>&1

copy /Y "%BACKUP%\technician-status.route.ts" "app\api\technician\orders\[id]\status\route.ts" >nul
copy /Y "%BACKUP%\order-execution.ts" "lib\order-execution.ts" >nul
copy /Y "%BACKUP%\package.json" "package.json" >nul

if exist "%BACKUP%\security-execution-integrity-check.mjs" (
  copy /Y "%BACKUP%\security-execution-integrity-check.mjs" "scripts\security-execution-integrity-check.mjs" >nul
) else (
  if exist "scripts\security-execution-integrity-check.mjs" del /Q "scripts\security-execution-integrity-check.mjs"
)

echo Backup restored.
echo Backup folder:
echo %BACKUP%

:fail
echo.
echo No completed-security claim has been made.
pause
exit /b 1
