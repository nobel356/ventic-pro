$ErrorActionPreference = "Stop"

function Fail-V20H5 {
    param([string]$Message)
    Write-Host ""
    Write-Host "V20H5 FAILED: $Message" -ForegroundColor Red
    Write-Host "No completed-lockdown claim has been made." -ForegroundColor Yellow
    exit 1
}

function Read-TextFile {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-TextFile {
    param(
        [string]$Path,
        [string]$Content
    )
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
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
    Fail-V20H5 "Could not locate the Ventic Pro repository. Put these files in the repository root."
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
        Fail-V20H5 "Missing expected V20H file: $path"
    }
}

$orders = Read-TextFile $ordersPath
$pricing = Read-TextFile $pricingPath
$guard = Read-TextFile $guardPath
$package = Read-TextFile $packagePath

if (!$orders.Contains("PERMISSIONS.ORDERS_VIEW")) {
    Fail-V20H5 "Admin orders protection is missing."
}

if ($orders -match 'customer\s*:\s*true') {
    Fail-V20H5 "Unsafe full Customer serialization still exists in admin orders."
}

if (!$pricing.Contains("PERMISSIONS.PRICE_EDIT")) {
    Fail-V20H5 "Admin pricing protection is missing."
}

if (
    !$guard.Contains("app/api/maintenance/route.ts") -or
    !$guard.Contains("app/api/complaints/route.ts")
) {
    Fail-V20H5 "Unexpected security-route-guard.mjs version."
}

Write-Host "Completing V20H with legacy-compatible PowerShell..." -ForegroundColor Cyan

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
    Fail-V20H5 "package.json could not be safely upgraded to the secured build scripts."
}

Write-TextFile $packagePath $updated

if (Test-Path $maintenancePath) {
    Remove-Item -Force $maintenancePath
}

if (Test-Path $complaintsPath) {
    Remove-Item -Force $complaintsPath
}

Write-Host "Running legacy-compatible PowerShell security scan..." -ForegroundColor Cyan

$adminRoot = Join-Path $root "app\api\admin"
$routes = Get-ChildItem -Path $adminRoot -Recurse -Filter "route.ts" | Where-Object { -not $_.PSIsContainer }

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
    $content = Read-TextFile $route.FullName

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
        $relative = $route.FullName.Substring($root.Length)
        while ($relative.StartsWith("\") -or $relative.StartsWith("/")) {
            $relative = $relative.Substring(1)
        }
        $relative = $relative.Replace("\","/")
        $failures += ($relative + " has no recognized authentication/authorization guard.")
    }
}

if (Test-Path $maintenancePath) {
    $failures += "Legacy app/api/maintenance/route.ts still exists."
}

if (Test-Path $complaintsPath) {
    $failures += "Legacy app/api/complaints/route.ts still exists."
}

$ordersNow = Read-TextFile $ordersPath
$pricingNow = Read-TextFile $pricingPath
$packageNow = Read-TextFile $packagePath

if (!$ordersNow.Contains("PERMISSIONS.ORDERS_VIEW")) {
    $failures += "Admin orders does not enforce ORDERS_VIEW."
}

if ($ordersNow -match 'customer\s*:\s*true') {
    $failures += "Admin orders still serializes full Customer records."
}

if (!$pricingNow.Contains("PERMISSIONS.PRICE_EDIT")) {
    $failures += "Admin pricing does not enforce PRICE_EDIT."
}

if (!$packageNow.Contains($securedBuild)) {
    $failures += "Production build does not run the security route guard."
}

if (!$packageNow.Contains($securedCheck)) {
    $failures += "security:check does not run the security route guard."
}

if (!$packageNow.Contains($securedRoutes)) {
    $failures += "security:routes script is missing."
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "Security regression scan FAILED:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host ("- " + $failure) -ForegroundColor Red
    }
    exit 1
}

Write-Host ("PowerShell security scan passed: " + $routes.Count + " Admin API routes checked.") -ForegroundColor Green

# Basic package.json structural sanity without ConvertFrom-Json / Node.
$trimmed = $packageNow.Trim()
if (
    !$trimmed.StartsWith("{") -or
    !$trimmed.EndsWith("}") -or
    !$packageNow.Contains('"scripts"') -or
    !$packageNow.Contains('"dependencies"')
) {
    Fail-V20H5 "package.json structural sanity check failed."
}

Write-Host "package.json structural check OK" -ForegroundColor Green

Write-Host "Running git diff --check..." -ForegroundColor Cyan
& git diff --check

if ($LASTEXITCODE -ne 0) {
    Fail-V20H5 "git diff --check failed."
}

Write-Host ""
Write-Host "V20H5 FINALIZED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Completed:" -ForegroundColor Cyan
Write-Host "- Admin orders protected"
Write-Host "- Sensitive Customer data exposure removed"
Write-Host "- Admin pricing protected and audited"
Write-Host "- Legacy maintenance endpoint removed"
Write-Host "- Legacy complaints endpoint removed"
Write-Host "- Security route guard wired into every Vercel production build"
Write-Host "- Legacy-compatible Admin API regression scan passed"
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20H5 - finalize security lockdown"
Write-Host ""
Write-Host "Commit and Push main. Vercel will run the Node-based guard again during build." -ForegroundColor Yellow
