@echo off
setlocal EnableExtensions
cd /d "%~dp0"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20K FAILED: Could not locate the Ventic Pro Git repository.
  echo Put all V20K files inside the ventic-pro repository root.
  goto :fail
)

cd /d "%REPO%"
echo.
echo Repository detected:
echo %REPO%
echo.

set "EXPECTED=b8ddfad9662105be9e822734e40197c2686dc1bf"
set "BACKUP=%REPO%\.v20k-backup-%RANDOM%%RANDOM%"

echo Fetching current Production main...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20K FAILED: Could not fetch origin/main.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo V20K FAILED: origin/main is not the tested V20J Production commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo Refusing to patch a different Production version.
  goto :fail
)

git diff --cached --quiet -- app/api/auth/login/route.ts app/api/coupons/validate/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/login/route.ts app/api/public/order-estimate/route.ts lib/request-security.ts package.json prisma/schema.prisma
if errorlevel 1 (
  echo V20K FAILED: One of the target files has staged changes.
  echo Commit or unstage those changes first.
  goto :fail
)

mkdir "%BACKUP%" >nul 2>&1
copy /Y "app\api\auth\login\route.ts" "%BACKUP%\staff-login.route.ts" >nul
copy /Y "app\api\coupons\validate\route.ts" "%BACKUP%\coupon.route.ts" >nul
copy /Y "app\api\customer\auth\forgot-password\route.ts" "%BACKUP%\forgot.route.ts" >nul
copy /Y "app\api\customer\auth\login\route.ts" "%BACKUP%\customer-login.route.ts" >nul
copy /Y "app\api\public\order-estimate\route.ts" "%BACKUP%\estimate.route.ts" >nul
copy /Y "lib\request-security.ts" "%BACKUP%\request-security.ts" >nul
copy /Y "package.json" "%BACKUP%\package.json" >nul
copy /Y "prisma\schema.prisma" "%BACKUP%\schema.prisma" >nul
if exist "scripts\security-abuse-protection-check.mjs" copy /Y "scripts\security-abuse-protection-check.mjs" "%BACKUP%\security-abuse-protection-check.mjs" >nul
if exist "prisma\migrations\20261105220000_security_rate_limits\migration.sql" copy /Y "prisma\migrations\20261105220000_security_rate_limits\migration.sql" "%BACKUP%\security-rate-limit-migration.sql" >nul

echo Backup created:
echo %BACKUP%
echo.

echo Restoring V20K tracked target files from origin/main...
git restore --source=origin/main --staged --worktree -- app/api/auth/login/route.ts app/api/coupons/validate/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/login/route.ts app/api/public/order-estimate/route.ts lib/request-security.ts package.json prisma/schema.prisma
if errorlevel 1 goto :rollback

if exist "scripts\security-abuse-protection-check.mjs" del /Q "scripts\security-abuse-protection-check.mjs"
if exist "prisma\migrations\20261105220000_security_rate_limits" rmdir /S /Q "prisma\migrations\20261105220000_security_rate_limits"

echo Checking tested Git patch...
git apply --check "%~dp0V20K.patch"
if errorlevel 1 goto :rollback

echo Applying V20K durable abuse-protection patch...
git apply --3way --index "%~dp0V20K.patch"
if errorlevel 1 goto :rollback

findstr /C:"durableRateLimit" "lib\request-security.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"model SecurityRateLimit" "prisma\schema.prisma" >nul
if errorlevel 1 goto :rollback

findstr /C:"security-abuse-protection-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

if not exist "prisma\migrations\20261105220000_security_rate_limits\migration.sql" goto :rollback
if not exist "scripts\security-abuse-protection-check.mjs" goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo V20K APPLIED SUCCESSFULLY
echo.
echo Security hardening added:
echo - Durable PostgreSQL rate limiting shared across Vercel instances
echo - Staff login: IP-wide + per-account limits
echo - Customer login: IP-wide + per-phone limits
echo - OTP reset: IP-wide + per-phone protection
echo - Coupon validation: rate limit + strict input bounds
echo - Public estimate: rate limit + quantity/array/value bounds
echo - Build-time regression guard
echo.
echo The patch includes one Prisma migration:
echo SecurityRateLimit table.
echo Vercel will apply it during the Production build before the new code goes live.
echo.
echo The patch is already staged in Git.
echo Commit message:
echo V20K - durable abuse protection
echo.
echo Then Push main.
echo.
pause
exit /b 0

:rollback
echo.
echo V20K verification failed. Restoring backup...

git reset HEAD -- app/api/auth/login/route.ts app/api/coupons/validate/route.ts app/api/customer/auth/forgot-password/route.ts app/api/customer/auth/login/route.ts app/api/public/order-estimate/route.ts lib/request-security.ts package.json prisma/schema.prisma scripts/security-abuse-protection-check.mjs prisma/migrations/20261105220000_security_rate_limits/migration.sql >nul 2>&1

copy /Y "%BACKUP%\staff-login.route.ts" "app\api\auth\login\route.ts" >nul
copy /Y "%BACKUP%\coupon.route.ts" "app\api\coupons\validate\route.ts" >nul
copy /Y "%BACKUP%\forgot.route.ts" "app\api\customer\auth\forgot-password\route.ts" >nul
copy /Y "%BACKUP%\customer-login.route.ts" "app\api\customer\auth\login\route.ts" >nul
copy /Y "%BACKUP%\estimate.route.ts" "app\api\public\order-estimate\route.ts" >nul
copy /Y "%BACKUP%\request-security.ts" "lib\request-security.ts" >nul
copy /Y "%BACKUP%\package.json" "package.json" >nul
copy /Y "%BACKUP%\schema.prisma" "prisma\schema.prisma" >nul

if exist "%BACKUP%\security-abuse-protection-check.mjs" (
  copy /Y "%BACKUP%\security-abuse-protection-check.mjs" "scripts\security-abuse-protection-check.mjs" >nul
) else (
  if exist "scripts\security-abuse-protection-check.mjs" del /Q "scripts\security-abuse-protection-check.mjs"
)

if exist "%BACKUP%\security-rate-limit-migration.sql" (
  if not exist "prisma\migrations\20261105220000_security_rate_limits" mkdir "prisma\migrations\20261105220000_security_rate_limits" >nul 2>&1
  copy /Y "%BACKUP%\security-rate-limit-migration.sql" "prisma\migrations\20261105220000_security_rate_limits\migration.sql" >nul
) else (
  if exist "prisma\migrations\20261105220000_security_rate_limits" rmdir /S /Q "prisma\migrations\20261105220000_security_rate_limits"
)

echo Backup restored.
echo Backup folder:
echo %BACKUP%

:fail
echo.
echo No completed-security claim has been made.
pause
exit /b 1
