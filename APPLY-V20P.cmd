@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "EXPECTED=8d50c0395cda64cc86487a61ad29ea4e6bc682ea"

for /f "delims=" %%I in ('git rev-parse --show-toplevel 2^>nul') do set "REPO=%%I"
if not defined REPO (
  echo.
  echo V20P FAILED: Could not locate the Ventic Pro Git repository.
  echo Put this installer inside the ventic-pro repository and run it again.
  goto :fail
)

cd /d "%REPO%"

echo.
echo ==========================================
echo V20P - RESILIENCE CONTROL CENTER
echo ==========================================
echo Repository:
echo %REPO%
echo.

echo Fetching origin/main...
git fetch --no-tags origin main
if errorlevel 1 (
  echo V20P FAILED: Could not fetch origin/main.
  goto :fail
)

for /f "delims=" %%S in ('git rev-parse origin/main 2^>nul') do set "REMOTE_SHA=%%S"

if /I not "%REMOTE_SHA%"=="%EXPECTED%" (
  echo.
  echo V20P FAILED: origin/main is not the tested V20N Production commit.
  echo Expected:
  echo %EXPECTED%
  echo Found:
  echo %REMOTE_SHA%
  echo.
  echo Refusing to patch an untested base.
  goto :fail
)

set "BACKUP=%REPO%\.v20p-backup-%RANDOM%%RANDOM%"
mkdir "%BACKUP%" >nul 2>&1

echo Creating backup...
call :backup "app\admin\AdminSidebar.tsx" "app_admin_AdminSidebar.tsx"
call :backup "app\api\coupons\validate\route.ts" "coupons_validate_route.ts"
call :backup "app\api\customer\aftercare\route.ts" "customer_aftercare_route.ts"
call :backup "app\api\customer\auth\forgot-password\route.ts" "forgot_password_route.ts"
call :backup "app\api\customer\auth\login\route.ts" "customer_login_route.ts"
call :backup "app\api\customer\auth\register\route.ts" "customer_register_route.ts"
call :backup "app\api\customer\auth\reset-password\route.ts" "reset_password_route.ts"
call :backup "app\api\leads\route.ts" "leads_route.ts"
call :backup "app\api\marketing\events\route.ts" "marketing_events_route.ts"
call :backup "app\api\orders\[id]\customer-attachments\route.ts" "customer_attachments_route.ts"
call :backup "app\api\orders\route.ts" "orders_route.ts"
call :backup "app\api\portfolio-videos\route.ts" "portfolio_videos_route.ts"
call :backup "app\api\public\order-estimate\route.ts" "order_estimate_route.ts"
call :backup "app\api\reviews\route.ts" "reviews_route.ts"
call :backup "app\order\OrderEntryGate.tsx" "OrderEntryGate.tsx"
call :backup "lib\admin-notifications.ts" "admin_notifications.ts"
call :backup "lib\customer-auth.ts" "customer_auth.ts"
call :backup "lib\customer-notifications.ts" "customer_notifications.ts"
call :backup "package.json" "package.json"
call :backup "prisma\schema.prisma" "schema.prisma"
call :backup "scripts\security-customer-claim-check.mjs" "security_customer_claim_check.mjs"

if exist "app\admin\control-center\ControlCenterClient.tsx" copy /Y "app\admin\control-center\ControlCenterClient.tsx" "%BACKUP%\ControlCenterClient.tsx" >nul
if exist "app\admin\control-center\page.tsx" copy /Y "app\admin\control-center\page.tsx" "%BACKUP%\control_center_page.tsx" >nul
if exist "app\api\admin\runtime-controls\route.ts" copy /Y "app\api\admin\runtime-controls\route.ts" "%BACKUP%\runtime_controls_route.ts" >nul
if exist "app\api\runtime\route.ts" copy /Y "app\api\runtime\route.ts" "%BACKUP%\public_runtime_route.ts" >nul
if exist "lib\runtime-control.ts" copy /Y "lib\runtime-control.ts" "%BACKUP%\runtime_control.ts" >nul
if exist "scripts\security-runtime-control-check.mjs" copy /Y "scripts\security-runtime-control-check.mjs" "%BACKUP%\security_runtime_control_check.mjs" >nul
if exist "prisma\migrations\20261105235100_runtime_control_center\migration.sql" copy /Y "prisma\migrations\20261105235100_runtime_control_center\migration.sql" "%BACKUP%\runtime_migration.sql" >nul

echo Backup:
echo %BACKUP%
echo.

echo Checking staged changes...
git diff --cached --quiet -- ^
 app/admin/AdminSidebar.tsx ^
 app/api/coupons/validate/route.ts ^
 app/api/customer/aftercare/route.ts ^
 app/api/customer/auth/forgot-password/route.ts ^
 app/api/customer/auth/login/route.ts ^
 app/api/customer/auth/register/route.ts ^
 app/api/customer/auth/reset-password/route.ts ^
 app/api/leads/route.ts ^
 app/api/marketing/events/route.ts ^
 app/api/orders/[id]/customer-attachments/route.ts ^
 app/api/orders/route.ts ^
 app/api/portfolio-videos/route.ts ^
 app/api/public/order-estimate/route.ts ^
 app/api/reviews/route.ts ^
 app/order/OrderEntryGate.tsx ^
 lib/admin-notifications.ts ^
 lib/customer-auth.ts ^
 lib/customer-notifications.ts ^
 package.json ^
 prisma/schema.prisma ^
 scripts/security-customer-claim-check.mjs
if errorlevel 1 (
  echo V20P FAILED: One or more target files have staged changes.
  goto :fail
)

echo Restoring tracked targets from tested origin/main...
git restore --source=origin/main --staged --worktree -- ^
 app/admin/AdminSidebar.tsx ^
 app/api/coupons/validate/route.ts ^
 app/api/customer/aftercare/route.ts ^
 app/api/customer/auth/forgot-password/route.ts ^
 app/api/customer/auth/login/route.ts ^
 app/api/customer/auth/register/route.ts ^
 app/api/customer/auth/reset-password/route.ts ^
 app/api/leads/route.ts ^
 app/api/marketing/events/route.ts ^
 app/api/orders/[id]/customer-attachments/route.ts ^
 app/api/orders/route.ts ^
 app/api/portfolio-videos/route.ts ^
 app/api/public/order-estimate/route.ts ^
 app/api/reviews/route.ts ^
 app/order/OrderEntryGate.tsx ^
 lib/admin-notifications.ts ^
 lib/customer-auth.ts ^
 lib/customer-notifications.ts ^
 package.json ^
 prisma/schema.prisma ^
 scripts/security-customer-claim-check.mjs
if errorlevel 1 goto :rollback

if exist "app\admin\control-center" rmdir /S /Q "app\admin\control-center"
if exist "app\api\admin\runtime-controls" rmdir /S /Q "app\api\admin\runtime-controls"
if exist "app\api\runtime" rmdir /S /Q "app\api\runtime"
if exist "lib\runtime-control.ts" del /Q "lib\runtime-control.ts"
if exist "scripts\security-runtime-control-check.mjs" del /Q "scripts\security-runtime-control-check.mjs"
if exist "prisma\migrations\20261105235100_runtime_control_center" rmdir /S /Q "prisma\migrations\20261105235100_runtime_control_center"

echo Checking V20P patch...
git apply --check "%~dp0V20P.patch"
if errorlevel 1 goto :rollback

echo Applying V20P...
git apply --3way --index "%~dp0V20P.patch"
if errorlevel 1 goto :rollback

echo Verifying markers...
if not exist "app\admin\control-center\page.tsx" goto :rollback
if not exist "app\admin\control-center\ControlCenterClient.tsx" goto :rollback
if not exist "app\api\admin\runtime-controls\route.ts" goto :rollback
if not exist "app\api\runtime\route.ts" goto :rollback
if not exist "lib\runtime-control.ts" goto :rollback
if not exist "scripts\security-runtime-control-check.mjs" goto :rollback
if not exist "prisma\migrations\20261105235100_runtime_control_center\migration.sql" goto :rollback

findstr /C:"ventic_pending_leads_v1" "app\order\OrderEntryGate.tsx" >nul
if errorlevel 1 goto :rollback

findstr /C:"existingCustomer?.archivedAt" "app\api\orders\route.ts" >nul
if errorlevel 1 goto :rollback

findstr /C:"model RuntimeSetting" "prisma\schema.prisma" >nul
if errorlevel 1 goto :rollback

findstr /C:"security-runtime-control-check.mjs" "package.json" >nul
if errorlevel 1 goto :rollback

git diff --cached --check
if errorlevel 1 goto :rollback

echo.
echo ==========================================
echo V20P APPLIED SUCCESSFULLY
echo ==========================================
echo.
echo Added:
echo - Super Admin Control Center
echo - NORMAL / LEAD_ONLY / MAINTENANCE modes
echo - Name + phone lead capture as the minimum operational path
echo - Local browser pending-lead fallback when server capture fails
echo - Automatic pending-lead retry
echo - Direct WhatsApp fallback
echo - Server-side toggles for Orders, Estimates, Coupons, Referrals, Uploads
echo - Customer Accounts, Registration, Phone OTP, Email recovery
echo - Reviews, Aftercare, Portfolio, Notifications, Marketing Tracking
echo - Customer identity takeover protection from public orders
echo - Runtime fail-safe to LEAD_ONLY if settings lookup fails
echo - Build-time regression guard
echo.
echo IMPORTANT:
echo V20P already contains the customer identity-security intent of V20O.
echo DO NOT install V20O separately after V20P.
echo.
echo Recommended current settings until SMS/WhatsApp OTP is connected:
echo   Mode = NORMAL
echo   Lead Capture = ON
echo   Detailed Orders = ON
echo   Customer Accounts = ON
echo   Account Registration = OFF
echo   Phone OTP = OFF
echo   Email OTP Recovery = ON
echo.
echo Emergency setting if anything becomes unstable:
echo   Mode = LEAD_ONLY
echo   Lead Capture = ON
echo.
echo Commit message:
echo V20P - resilience control center and lead fallback
echo.
echo Then Push main.
echo After Production is READY open:
echo /admin/control-center
echo.
echo DO NOT commit .v20p-backup-* folders.
echo.
pause
exit /b 0

:backup
if exist "%~1" copy /Y "%~1" "%BACKUP%\%~2" >nul
exit /b 0

:rollback
echo.
echo V20P verification failed. Restoring tested baseline and backup...

git reset HEAD -- . >nul 2>&1

git restore --source=origin/main --staged --worktree -- ^
 app/admin/AdminSidebar.tsx ^
 app/api/coupons/validate/route.ts ^
 app/api/customer/aftercare/route.ts ^
 app/api/customer/auth/forgot-password/route.ts ^
 app/api/customer/auth/login/route.ts ^
 app/api/customer/auth/register/route.ts ^
 app/api/customer/auth/reset-password/route.ts ^
 app/api/leads/route.ts ^
 app/api/marketing/events/route.ts ^
 app/api/orders/[id]/customer-attachments/route.ts ^
 app/api/orders/route.ts ^
 app/api/portfolio-videos/route.ts ^
 app/api/public/order-estimate/route.ts ^
 app/api/reviews/route.ts ^
 app/order/OrderEntryGate.tsx ^
 lib/admin-notifications.ts ^
 lib/customer-auth.ts ^
 lib/customer-notifications.ts ^
 package.json ^
 prisma/schema.prisma ^
 scripts/security-customer-claim-check.mjs >nul 2>&1

if exist "app\admin\control-center" rmdir /S /Q "app\admin\control-center"
if exist "app\api\admin\runtime-controls" rmdir /S /Q "app\api\admin\runtime-controls"
if exist "app\api\runtime" rmdir /S /Q "app\api\runtime"
if exist "lib\runtime-control.ts" del /Q "lib\runtime-control.ts"
if exist "scripts\security-runtime-control-check.mjs" del /Q "scripts\security-runtime-control-check.mjs"
if exist "prisma\migrations\20261105235100_runtime_control_center" rmdir /S /Q "prisma\migrations\20261105235100_runtime_control_center"

echo Restored origin/main baseline.
echo Backup retained at:
echo %BACKUP%

:fail
echo.
echo V20P was NOT completed.
pause
exit /b 1
