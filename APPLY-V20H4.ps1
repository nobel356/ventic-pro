$ErrorActionPreference = "Stop"

function Fail-V20H4 {
    param([string]$Message)
    Write-Host ""
    Write-Host "V20H4 FAILED: $Message" -ForegroundColor Red
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
    Fail-V20H4 "Could not locate the Ventic Pro repository. Put these files in the repository root."
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
        Fail-V20H4 "Missing expected V20H file: $path"
    }
}

$orders = Get-Content -Raw -Encoding UTF8 $ordersPath
$pricing = Get-Content -Raw -Encoding UTF8 $pricingPath
$guard = Get-Content -Raw -Encoding UTF8 $guardPath
$package = Get-Content -Raw -Encoding UTF8 $packagePath

if (!$orders.Contains("PERMISSIONS.ORDERS_VIEW")) {
    Fail-V20H4 "Admin orders protection is missing."
}

if ($orders -match 'customer\s*:\s*true') {
    Fail-V20H4 "Unsafe full Customer serialization still exists in admin orders."
}

if (!$pricing.Contains("PERMISSIONS.PRICE_EDIT")) {
    Fail-V20H4 "Admin pricing protection is missing."
}

if (
    !$guard.Contains("app/api/maintenance/route.ts") -or
    !$guard.Contains("app/api/complaints/route.ts")
) {
    Fail-V20H4 "Unexpected security-route-guard.mjs version."
}

Write-Host "Completing V20H without local Node.js..." -ForegroundColor Cyan

$oldBuild = '"build": "prisma generate && node scripts/production-migrate.mjs && next build"'
$securedBuild = '"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'

$oldCheck = '"security:check": "node scripts/security-check.mjs"'
$securedCheck = '"security:check": "node scripts/security-check.mjs && node scripts/security-route-guard.mjs"'
$securedRoutes = '"security:routes": "node scripts/security-route-guard.mjs"'

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

if (
    !$updated.Contains($securedBuild) -or
    !$updated.Contains($securedCheck) -or
    !$updated.Contains($securedRoutes)
) {
    Fail-V20H4 "package.json could not be safely upgraded to the secured build scripts."
}

$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($packagePath, $updated, $utf8)

if (Test-Path $maintenancePath) {
    Remove-Item -Force $maintenancePath
}

if (Test-Path $complaintsPath) {
    Remove-Item -Force $complaintsPath
}

Write-Host "Running PowerShell security regression scan..." -ForegroundColor Cyan

$adminRoot = Join-Path $root "app\api\admin"
$routes = Get-ChildItem -Path $adminRoot -Recurse -Filter "route.ts" -File

$authMarkers = @(
    "requirePermission(",
    "requireSuperAdmin(",
    "currentUser(",
    "requireArchiveActor(",
    "requireVaultUnlocked(",
    "archiveActorFor("
)

$authModules = @(
    "@/lib/auth-v7",
    "@/lib/archive-vault"
)

$failures = @()

foreach ($route in $routes) {
    $content = Get-Content -Raw -Encoding UTF8 $route.FullName

    $hasModule = $false
    foreach ($module in $authModules) {
        if ($content.Contains($module)) {
            $hasModule = $true
            break
        }
    }

    $hasGuard = $false
    foreach ($marker in $authMarkers) {
        if ($content.Contains($marker)) {
            $hasGuard = $true
            break
        }
    }

    if (!$hasModule -or !$hasGuard) {
        $relative = $route.FullName.Substring($root.Length).TrimStart('\').Replace('\','/')
        $failures += "$relative has no recognized authentication/authorization guard."
    }
}

if (Test-Path $maintenancePath) {
    $failures += "Legacy app/api/maintenance/route.ts still exists."
}

if (Test-Path $complaintsPath) {
    $failures += "Legacy app/api/complaints/route.ts still exists."
}

$ordersNow = Get-Content -Raw -Encoding UTF8 $ordersPath
$pricingNow = Get-Content -Raw -Encoding UTF8 $pricingPath

if (!$ordersNow.Contains("PERMISSIONS.ORDERS_VIEW")) {
    $failures += "Admin orders does not enforce ORDERS_VIEW."
}

if ($ordersNow -match 'customer\s*:\s*true') {
    $failures += "Admin orders still serializes full Customer records."
}

if (!$pricingNow.Contains("PERMISSIONS.PRICE_EDIT")) {
    $failures += "Admin pricing does not enforce PRICE_EDIT."
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Security regression scan FAILED:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host "- $failure" -ForegroundColor Red
    }
    exit 1
}

Write-Host ("PowerShell security scan passed: {0} Admin API routes checked." -f $routes.Count) -ForegroundColor Green

# Validate JSON using PowerShell itself.
try {
    $null = Get-Content -Raw -Encoding UTF8 $packagePath | ConvertFrom-Json
    Write-Host "package.json OK" -ForegroundColor Green
}
catch {
    Fail-V20H4 "package.json is not valid JSON."
}

Write-Host "Running git diff --check..." -ForegroundColor Cyan
& git diff --check

if ($LASTEXITCODE -ne 0) {
    Fail-V20H4 "git diff --check failed."
}

Write-Host ""
Write-Host "V20H4 FINALIZED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Completed:" -ForegroundColor Cyan
Write-Host "- Admin orders protected"
Write-Host "- Sensitive Customer data exposure removed"
Write-Host "- Admin pricing protected and audited"
Write-Host "- Legacy maintenance endpoint removed"
Write-Host "- Legacy complaints endpoint removed"
Write-Host "- Security regression guard added to every Vercel build"
Write-Host "- Admin API regression scan passed locally without Node.js"
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20H4 - complete security lockdown"
Write-Host ""
Write-Host "Commit and Push main. Vercel has Node.js and will run the JS guard again during build." -ForegroundColor Yellow
