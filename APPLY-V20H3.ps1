$ErrorActionPreference = "Stop"

function Fail-V20H3 {
    param([string]$Message)
    Write-Host ""
    Write-Host "V20H3 FAILED: $Message" -ForegroundColor Red
    Write-Host "No completed-lockdown claim has been made." -ForegroundColor Yellow
    exit 1
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$root = $scriptDir
$found = $false

for ($i = 0; $i -lt 5; $i++) {
    if (
        (Test-Path (Join-Path $root "package.json")) -and
        (Test-Path (Join-Path $root "app")) -and
        (Test-Path (Join-Path $root ".git"))
    ) {
        $found = $true
        break
    }

    $parent = Split-Path -Parent $root
    if (!$parent -or $parent -eq $root) {
        break
    }
    $root = $parent
}

if (!$found) {
    Fail-V20H3 "Could not locate the Ventic Pro repository. Put these two files in the repository root."
}

Set-Location $root

Write-Host ""
Write-Host "Repository detected:" -ForegroundColor Cyan
Write-Host $root
Write-Host ""

$packagePath = Join-Path $root "package.json"
$ordersPath = Join-Path $root "app\api\admin\orders\route.ts"
$pricingPath = Join-Path $root "app\api\admin\pricing\route.ts"
$guardPath = Join-Path $root "scripts\security-route-guard.mjs"
$maintenancePath = Join-Path $root "app\api\maintenance\route.ts"
$complaintsPath = Join-Path $root "app\api\complaints\route.ts"

foreach ($path in @($packagePath, $ordersPath, $pricingPath, $guardPath)) {
    if (!(Test-Path $path)) {
        Fail-V20H3 "Missing expected V20H file: $path"
    }
}

$orders = Get-Content -Raw -Encoding UTF8 $ordersPath
$pricing = Get-Content -Raw -Encoding UTF8 $pricingPath
$guard = Get-Content -Raw -Encoding UTF8 $guardPath
$package = Get-Content -Raw -Encoding UTF8 $packagePath

if (!$orders.Contains("PERMISSIONS.ORDERS_VIEW")) {
    Fail-V20H3 "Admin orders protection is not present. V20H3 only finalizes an already-applied V20H2."
}

if (!$pricing.Contains("PERMISSIONS.PRICE_EDIT")) {
    Fail-V20H3 "Admin pricing protection is not present. V20H3 only finalizes an already-applied V20H2."
}

if (
    !$guard.Contains("app/api/maintenance/route.ts") -or
    !$guard.Contains("app/api/complaints/route.ts")
) {
    Fail-V20H3 "The V20H regression guard is not the expected version."
}

$securedBuild = '"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'
$securedCheck = '"security:check": "node scripts/security-check.mjs && node scripts/security-route-guard.mjs"'
$securedRoutes = '"security:routes": "node scripts/security-route-guard.mjs"'

$alreadyComplete =
    $package.Contains($securedBuild) -and
    $package.Contains($securedCheck) -and
    $package.Contains($securedRoutes) -and
    !(Test-Path $maintenancePath) -and
    !(Test-Path $complaintsPath)

if ($alreadyComplete) {
    Write-Host "V20H is already fully finalized. Running verification..." -ForegroundColor Yellow
    & node scripts/security-route-guard.mjs
    if ($LASTEXITCODE -ne 0) {
        Fail-V20H3 "Regression guard failed."
    }
    Write-Host "V20H3 VERIFIED SUCCESSFULLY" -ForegroundColor Green
    exit 0
}

$dirty = & git status --porcelain -- `
    package.json `
    app/api/maintenance/route.ts `
    app/api/complaints/route.ts

if ($dirty) {
    Fail-V20H3 ("Target files have local changes. Commit/stash them first:`n" + ($dirty -join "`n"))
}

$oldBuild = '"build": "prisma generate && node scripts/production-migrate.mjs && next build"'
$oldCheck = '"security:check": "node scripts/security-check.mjs"'

if (!$package.Contains($oldBuild) -and !$package.Contains($securedBuild)) {
    Fail-V20H3 "Unexpected package.json build script. Refusing to edit blindly."
}

if (!$package.Contains($oldCheck) -and !$package.Contains($securedCheck)) {
    Fail-V20H3 "Unexpected package.json security:check script. Refusing to edit blindly."
}

Write-Host "Finalizing V20H Security Lockdown..." -ForegroundColor Cyan

$updated = $package

if ($updated.Contains($oldBuild)) {
    $updated = $updated.Replace($oldBuild, $securedBuild)
}

if ($updated.Contains($oldCheck)) {
    $replacement =
        $securedCheck + "," +
        [Environment]::NewLine +
        '    "security:routes": "node scripts/security-route-guard.mjs"'

    $updated = $updated.Replace($oldCheck, $replacement)
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($packagePath, $updated, $utf8)

if (Test-Path $maintenancePath) {
    Remove-Item -Force $maintenancePath
}

if (Test-Path $complaintsPath) {
    Remove-Item -Force $complaintsPath
}

Write-Host "Running V20H regression guard..." -ForegroundColor Cyan
& node scripts/security-route-guard.mjs

if ($LASTEXITCODE -ne 0) {
    Write-Host "Verification failed. Restoring target files..." -ForegroundColor Yellow
    & git restore -- `
        package.json `
        app/api/maintenance/route.ts `
        app/api/complaints/route.ts
    Fail-V20H3 "Regression guard rejected the final state."
}

Write-Host "Validating package.json..." -ForegroundColor Cyan
& node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package.json OK')"

if ($LASTEXITCODE -ne 0) {
    & git restore -- `
        package.json `
        app/api/maintenance/route.ts `
        app/api/complaints/route.ts
    Fail-V20H3 "package.json validation failed."
}

& git diff --check
if ($LASTEXITCODE -ne 0) {
    Fail-V20H3 "git diff --check failed."
}

Write-Host ""
Write-Host "V20H3 FINALIZED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Completed:" -ForegroundColor Cyan
Write-Host "- Removed legacy /api/maintenance endpoint"
Write-Host "- Removed legacy /api/complaints endpoint"
Write-Host "- Security route guard now runs on every production build"
Write-Host "- security:check now includes the route guard"
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20H3 - finalize security lockdown"
Write-Host ""
Write-Host "Commit + Push, then Vercel will deploy the fully locked version." -ForegroundColor Yellow
