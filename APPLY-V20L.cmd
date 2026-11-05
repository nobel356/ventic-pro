@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20L FAILED: Could not locate the Ventic Pro Git repository.
  echo Put all V20L files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "EXPECTED=c05c381c2a8f006929ae2833f9b45a3b2f899d55"
set "BACKUP=%REPO%\.v20l-backup-%RANDOM%%RANDOM%"

echo Fetching current Production main...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20L FAILED: Could not fetch origin/main.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo V20L FAILED: origin/main is not the tested V20K Production commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo Refusing to patch a different Production version.
  goto :fail
)

git diff --cached --quiet -- lib/technician.ts package.json scripts/security-technician-auth-check.mjs
if errorlevel 1 (
  echo V20L FAILED: One of the target files has staged changes.
  echo Commit or unstage those changes first.
  goto :fail
)

mkdir "%BACKUP%" >nul 2>&1
copy /Y "lib\technician.ts" "%BACKUP%\technician.ts" >nul
copy /Y "package.json" "%BACKUP%\package.json" >nul
if exist "scripts\security-technician-auth-check.mjs" copy /Y "scripts\security-technician-auth-check.mjs" "%BACKUP%\security-technician-auth-check.mjs" >nul

echo Backup created:
echo %BACKUP%
echo.

echo Restoring V20L tracked target files from origin/main...
git restore --source=origin/main --staged --worktree -- lib/technician.ts package.json
if errorlevel 1 goto :rollback

if exist "scripts\security-technician-auth-check.mjs" del /Q "scripts\security-technician-auth-check.mjs"

echo Checking tested Git patch...
git apply --check "%~dp0V20L.patch"
if errorlevel 1 goto :rollback

echo Applying V20L Technician Auth Lockdown...
git apply --3way --index "%~dp0V20L.patch"
if errorlevel 1 goto :rollback

findstr /C:"currentUser" "lib\technician.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"DEMO_TECHNICIAN_ID" "lib\technician.ts" >nul
if not errorlevel 1 goto :rollback

findstr /C:"ventic_tech" "lib\technician.ts" >nul
if not errorlevel 1 goto :rollback

findstr /C:"security-technician-auth-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

if not exist "scripts\security-technician-auth-check.mjs" goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo V20L APPLIED SUCCESSFULLY
echo.
echo Security fix:
echo - Removed unsigned legacy technician cookie authentication
echo - Removed DEMO_TECHNICIAN_ID fallback
echo - Technician APIs now require the authenticated staff session
echo - Added a build-time regression guard for every technician API route
echo.
echo The patch is already staged in Git.
echo Commit message:
echo V20L - technician auth lockdown
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20L verification failed. Restoring backup...

git reset HEAD -- lib/technician.ts package.json scripts/security-technician-auth-check.mjs >nul 2>&1

copy /Y "%BACKUP%\technician.ts" "lib\technician.ts" >nul
copy /Y "%BACKUP%\package.json" "package.json" >nul

if exist "%BACKUP%\security-technician-auth-check.mjs" (
  copy /Y "%BACKUP%\security-technician-auth-check.mjs" "scripts\security-technician-auth-check.mjs" >nul
) else (
  if exist "scripts\security-technician-auth-check.mjs" del /Q "scripts\security-technician-auth-check.mjs"
)

echo Backup restored.
echo Backup folder:
echo %BACKUP%

:fail
echo.
echo No completed-security claim has been made.
pause
exit /b 1
