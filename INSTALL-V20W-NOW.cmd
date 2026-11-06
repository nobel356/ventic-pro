@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "URL=https://sonic-acacia-7jcw28s.tmp.now/Ventic-Pro-V20W-Customer-Journey-Integrity.zip"
set "EXPECTED_SHA=7c7eed21159e2b9d02fc7766a43808e497eb0c9203142514178752ae04a015da"
set "ZIP=%TEMP%\Ventic-Pro-V20W-Customer-Journey-Integrity.zip"
set "OUT=%TEMP%\Ventic-Pro-V20W-Customer-Journey-Integrity"

echo.
echo ==========================================
echo V20W - VERIFIED BOOTSTRAP INSTALLER
echo ==========================================
echo.
echo Downloading the tested V20W package...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%ZIP%'"
if errorlevel 1 goto :download_fail

for /f "delims=" %%H in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 -LiteralPath '%ZIP%').Hash.ToLower()"') do set "ACTUAL_SHA=%%H"

echo Expected SHA256: %EXPECTED_SHA%
echo Actual   SHA256: %ACTUAL_SHA%

if /I not "%ACTUAL_SHA%"=="%EXPECTED_SHA%" (
  echo.
  echo V20W FAILED: SHA256 mismatch. The downloaded package will NOT be executed.
  del /q "%ZIP%" >nul 2>&1
  goto :fail
)

echo SHA256 VERIFIED.

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%OUT%' -Force"
if errorlevel 1 goto :fail

if not exist "%OUT%\APPLY-V20W.cmd" (
  echo V20W FAILED: APPLY-V20W.cmd not found after extraction.
  goto :fail
)

echo.
echo Starting the verified V20W installer...
call "%OUT%\APPLY-V20W.cmd"
set "RC=%ERRORLEVEL%"
exit /b %RC%

:download_fail
echo.
echo V20W DOWNLOAD FAILED.
echo The temporary transfer URL may have expired. Ask ChatGPT to regenerate the V20W transfer package.
goto :fail

:fail
echo.
echo V20W was NOT installed.
pause
exit /b 1
