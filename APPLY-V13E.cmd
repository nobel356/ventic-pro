@echo off
setlocal
cd /d "%~dp0"
echo.
echo Ventic Pro V13E - Bulk Archive + Hard Delete
echo ============================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0APPLY-V13E.ps1"
if errorlevel 1 (
  echo.
  echo Patch failed. Do not commit partial changes.
  pause
  exit /b 1
)
echo.
echo Done.
pause
