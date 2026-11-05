$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Fail-V20H {
    param([string]$Message)
    Write-Host ""
    Write-Host "V20H FAILED: $Message" -ForegroundColor Red
    Write-Host "No claim of success has been made. Fix the issue above and run again." -ForegroundColor Yellow
    exit 1
}

function Write-Utf8NoBom {
    param(
        [string]$Path,
        [string]$Content
    )
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

$payload = Join-Path $root "V20H-PAYLOAD"

$required = @(
    "package.json",
    "app\api\admin\orders\route.ts",
    "app\api\admin\pricing\route.ts",
    "V20H-PAYLOAD\app\api\admin\orders\route.ts",
    "V20H-PAYLOAD\app\api\admin\pricing\route.ts",
    "V20H-PAYLOAD\scripts\security-route-guard.mjs",
    "V20H-PAYLOAD\README-V20H.md"
)

foreach ($item in $required) {
    if (!(Test-Path (Join-Path $root $item))) {
        Fail-V20H "Missing required file: $item. Extract the ZIP into the repository root."
    }
}

$git = Get-Command git -ErrorAction SilentlyContinue
if (!$git) {
    Fail-V20H "Git is required so the patch can verify the repository state safely."
}

$inside = (& git rev-parse --is-inside-work-tree 2>$null)
if ($LASTEXITCODE -ne 0 -or "$inside".Trim() -ne "true") {
    Fail-V20H "This folder is not a Git repository. Put the V20H package in the Ventic Pro repository root."
}

$baseCommit = "02d6a9afd383e3cabda3672d7d335d42bc7df15e"
& git cat-file -e "$baseCommit^{commit}" 2>$null
if ($LASTEXITCODE -ne 0) {
    Fail-V20H "Expected V20G2 base commit is not present in this repository."
}

& git merge-base --is-ancestor $baseCommit HEAD 2>$null
if ($LASTEXITCODE -ne 0) {
    Fail-V20H "Current HEAD is not based on V20G2. Refusing to overwrite unrelated code."
}

$protectedPaths = @(
    "app/api/admin/orders/route.ts",
    "app/api/admin/pricing/route.ts",
    "app/api/maintenance/route.ts",
    "app/api/complaints/route.ts",
    "package.json",
    "scripts/security-route-guard.mjs",
    "README-V20H.md"
)

$dirty = & git status --porcelain -- $protectedPaths
if ($dirty) {
    Fail-V20H "One or more V20H target files already have local changes. Commit/stash them first:`n$dirty"
}

$ordersPath = Join-Path $root "app\api\admin\orders\route.ts"
$pricingPath = Join-Path $root "app\api\admin\pricing\route.ts"
$legacyMaintenance = Join-Path $root "app\api\maintenance\route.ts"
$legacyComplaints = Join-Path $root "app\api\complaints\route.ts"
$guardPath = Join-Path $root "scripts\security-route-guard.mjs"

$ordersCurrent = Get-Content -Raw -Encoding UTF8 $ordersPath
$pricingCurrent = Get-Content -Raw -Encoding UTF8 $pricingPath
$packagePath = Join-Path $root "package.json"
$packageCurrent = Get-Content -Raw -Encoding UTF8 $packagePath

$alreadyApplied =
    $ordersCurrent.Contains("PERMISSIONS.ORDERS_VIEW") -and
    $pricingCurrent.Contains("PERMISSIONS.PRICE_EDIT") -and
    (Test-Path $guardPath) -and
    !$packageCurrent.Contains('"build": "prisma generate && node scripts/production-migrate.mjs && next build"') -and
    !(Test-Path $legacyMaintenance) -and
    !(Test-Path $legacyComplaints)

if ($alreadyApplied) {
    Write-Host "V20H already appears to be applied. Running the regression guard..." -ForegroundColor Yellow
    & node scripts/security-route-guard.mjs
    if ($LASTEXITCODE -ne 0) {
        Fail-V20H "Existing V20H regression guard failed."
    }
    Write-Host "V20H is already applied and the guard passes." -ForegroundColor Green
    exit 0
}

if (!$ordersCurrent.Contains("customer:true") -and !$ordersCurrent.Contains("customer: true")) {
    Fail-V20H "Orders route does not match the expected pre-V20H vulnerable implementation."
}

if ($ordersCurrent.Contains("@/lib/auth-v7")) {
    Fail-V20H "Orders route already contains auth changes that V20H did not author. Review manually instead of overwriting."
}

if (!$pricingCurrent.Contains("prisma.service.upsert")) {
    Fail-V20H "Pricing route does not match the expected pre-V20H implementation."
}

if ($pricingCurrent.Contains("@/lib/auth-v7")) {
    Fail-V20H "Pricing route already contains auth changes that V20H did not author. Review manually instead of overwriting."
}

$oldBuild = '"build": "prisma generate && node scripts/production-migrate.mjs && next build"'
$newBuild = '"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'
$oldSecurity = '"security:check": "node scripts/security-check.mjs"'
$newSecurity = '"security:check": "node scripts/security-check.mjs && node scripts/security-route-guard.mjs",' + [Environment]::NewLine + '    "security:routes": "node scripts/security-route-guard.mjs"'

if (!$packageCurrent.Contains($oldBuild)) {
    Fail-V20H "package.json build script differs from the tested V20G2 version."
}
if (!$packageCurrent.Contains($oldSecurity)) {
    Fail-V20H "package.json security:check script differs from the tested V20G2 version."
}

Write-Host ""
Write-Host "Applying V20H Security Lockdown..." -ForegroundColor Cyan

Copy-Item -Force `
    (Join-Path $payload "app\api\admin\orders\route.ts") `
    $ordersPath

Copy-Item -Force `
    (Join-Path $payload "app\api\admin\pricing\route.ts") `
    $pricingPath

$scriptDir = Join-Path $root "scripts"
if (!(Test-Path $scriptDir)) {
    New-Item -ItemType Directory -Path $scriptDir | Out-Null
}

Copy-Item -Force `
    (Join-Path $payload "scripts\security-route-guard.mjs") `
    $guardPath

Copy-Item -Force `
    (Join-Path $payload "README-V20H.md") `
    (Join-Path $root "README-V20H.md")

if (Test-Path $legacyMaintenance) {
    Remove-Item -Force $legacyMaintenance
}
if (Test-Path $legacyComplaints) {
    Remove-Item -Force $legacyComplaints
}

$packageUpdated = $packageCurrent.Replace($oldBuild, $newBuild)
$packageUpdated = $packageUpdated.Replace($oldSecurity, $newSecurity)
Write-Utf8NoBom -Path $packagePath -Content $packageUpdated

Write-Host "Running V20H regression guard..." -ForegroundColor Cyan
& node scripts/security-route-guard.mjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "Guard failed. Restoring tracked files from Git..." -ForegroundColor Yellow
    & git restore -- `
        app/api/admin/orders/route.ts `
        app/api/admin/pricing/route.ts `
        app/api/maintenance/route.ts `
        app/api/complaints/route.ts `
        package.json
    Remove-Item -Force -ErrorAction SilentlyContinue $guardPath
    Remove-Item -Force -ErrorAction SilentlyContinue (Join-Path $root "README-V20H.md")
    Fail-V20H "Regression guard rejected the result; tracked changes were restored."
}

Write-Host "Running git diff --check..." -ForegroundColor Cyan
& git diff --check
if ($LASTEXITCODE -ne 0) {
    Fail-V20H "git diff --check found whitespace/patch errors. Review before committing."
}

Write-Host ""
Write-Host "V20H APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Security changes:" -ForegroundColor Cyan
Write-Host "- /api/admin/orders now requires ORDERS_VIEW"
Write-Host "- Full Customer serialization removed; passwordHash cannot leak from this list route"
Write-Host "- Customer phone/address masked without CUSTOMER_SENSITIVE"
Write-Host "- /api/admin/pricing requires PRICE_EDIT"
Write-Host "- Pricing writes validated and audited"
Write-Host "- /api/maintenance removed"
Write-Host "- /api/complaints removed"
Write-Host "- Build-time admin API auth regression guard enabled"
Write-Host ""
Write-Host "Next commit message:" -ForegroundColor Cyan
Write-Host "V20H - security lockdown"
Write-Host ""
Write-Host "Then push main so Vercel deploys the secured build." -ForegroundColor Yellow
