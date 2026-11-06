@echo off
setlocal EnableExtensions EnableDelayedExpansion

set "URL=https://sonic-acacia-7jcw28s.tmp.now/Ventic-Pro-V20W-Customer-Journey-Integrity.zip"
set "EXPECTED_SHA=7c7eed21159e2b9d02fc7766a43808e497eb0c9203142514178752ae04a015da"
set "ZIP=%TEMP%\Ventic-Pro-V20W-Customer-Journey-Integrity.zip"
set "OUT=%TEMP%\Ventic-Pro-V20W-Customer-Journey-Integrity"

echo.
echo ==========================================
echo V20W - VERIFIED BOOTSTRAP V2
echo ==========================================
echo.

echo [1/5] Locating Ventic Pro repository...

set "REPO="

call :tryrepo "%CD%"
if defined REPO goto :repo_found

call :tryrepo "%~dp0"
if defined REPO goto :repo_found

call :tryrepo "%USERPROFILE%\ventic-pro"
if defined REPO goto :repo_found

call :tryrepo "%USERPROFILE%\Desktop\ventic-pro"
if defined REPO goto :repo_found

call :tryrepo "%USERPROFILE%\Documents\ventic-pro"
if defined REPO goto :repo_found

call :tryrepo "%USERPROFILE%\Documents\GitHub\ventic-pro"
if defined REPO goto :repo_found

call :tryrepo "%USERPROFILE%\source\repos\ventic-pro"
if defined REPO goto :repo_found

echo.
echo Ventic Pro repository was not found automatically.
echo Open File Explorer, locate the folder that contains:
echo   .git
echo   app
echo   package.json
echo.
set /p "MANUAL_REPO=Paste the full ventic-pro folder path here: "
call :tryrepo "%MANUAL_REPO%"

if not defined REPO (
  echo.
  echo V20W FAILED: The selected folder is not a valid Ventic Pro Git repository.
  goto :fail
)

:repo_found
echo Repository:
echo %REPO%
echo.

echo [2/5] Downloading the exact tested V20W package...

powershell -NoProfile -ExecutionPolicy Bypass -Command "Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -OutFile '%ZIP%'"
if errorlevel 1 goto :download_fail

for /f "delims=" %%H in ('powershell -NoProfile -Command "(Get-FileHash -Algorithm SHA256 -LiteralPath '%ZIP%').Hash.ToLower()"') do set "ACTUAL_SHA=%%H"

echo Expected SHA256: %EXPECTED_SHA%
echo Actual   SHA256: %ACTUAL_SHA%

if /I not "%ACTUAL_SHA%"=="%EXPECTED_SHA%" (
  echo.
  echo V20W FAILED: SHA256 mismatch.
  echo The downloaded package will NOT be executed.
  del /q "%ZIP%" >nul 2>&1
  goto :fail
)

echo SHA256 VERIFIED.
echo.

echo [3/5] Extracting verified package...

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%"
powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%ZIP%' -DestinationPath '%OUT%' -Force"
if errorlevel 1 goto :fail

if not exist "%OUT%\V20W.patch" goto :package_fail
if not exist "%OUT%\APPLY-V20W.cmd" goto :package_fail
if not exist "%OUT%\README-V20W.txt" goto :package_fail

echo [4/5] Copying verified installer into the repository...

copy /Y "%OUT%\V20W.patch" "%REPO%\V20W.patch" >nul
if errorlevel 1 goto :fail

copy /Y "%OUT%\APPLY-V20W.cmd" "%REPO%\APPLY-V20W.cmd" >nul
if errorlevel 1 goto :fail

copy /Y "%OUT%\README-V20W.txt" "%REPO%\README-V20W.txt" >nul
if errorlevel 1 goto :fail

echo [5/5] Starting V20W from the correct repository...

pushd "%REPO%"
call "%REPO%\APPLY-V20W.cmd"
set "RC=%ERRORLEVEL%"
popd

if not "%RC%"=="0" (
  echo.
  echo V20W installer returned an error.
  goto :fail
)

echo.
echo ==========================================
echo V20W BOOTSTRAP V2 FINISHED SUCCESSFULLY
echo ==========================================
echo.
echo Next commands:
echo cd /d "%REPO%"
echo git commit -m "V20W - customer journey integrity"
echo git push origin main
echo.
pause
exit /b 0

:tryrepo
set "CANDIDATE=%~1"
if "%CANDIDATE%"=="" exit /b 0

for /f "delims=" %%R in ('git -C "%CANDIDATE%" rev-parse --show-toplevel 2^>nul') do (
  if exist "%%R\package.json" if exist "%%R\app" (
    set "REPO=%%R"
  )
)
exit /b 0

:download_fail
echo.
echo V20W DOWNLOAD FAILED.
echo The temporary transfer URL may have expired.
goto :fail

:package_fail
echo.
echo V20W FAILED: Verified ZIP is missing one or more installer files.
goto :fail

:fail
echo.
echo V20W was NOT applied by Bootstrap V2.
pause
exit /b 1
