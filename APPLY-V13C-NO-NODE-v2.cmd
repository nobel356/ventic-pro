@echo off
setlocal
cd /d "%~dp0"
echo.
echo Ventic Pro V13C - No Node Fix v2
echo =================================
echo.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0APPLY-V13C-NO-NODE-v2.ps1"
if errorlevel 1 (
  echo.
  echo Patch failed. Do not commit partial changes.
  pause
  exit /b 1
)
echo.
echo Done.
pause
