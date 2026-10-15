@echo off
setlocal
cd /d "%~dp0"
echo.
echo Ventic Pro V13C - Conversion Flow
echo =================================
echo.
node scripts\apply-v13c-conversion.mjs
if errorlevel 1 (
  echo.
  echo Patch failed. Do not commit partial changes.
  pause
  exit /b 1
)
echo.
echo Done. Open GitHub Desktop and review the V13C changes.
pause
