$ErrorActionPreference = "Stop"

function Fail-V20I2 {
    param([string]$Message)
    Write-Host ""
    Write-Host "V20I2 FAILED: $Message" -ForegroundColor Red
    Write-Host "No completed-security claim has been made." -ForegroundColor Yellow
    exit 1
}

function Read-TextFile {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-TextFile {
    param([string]$Path, [string]$Content)
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Replace-Once {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    $content = Read-TextFile $Path

    if (!$content.Contains($Old)) {
        Fail-V20I2 ("Missing marker in " + $Path + " (" + $Label + ").")
    }

    $index = $content.IndexOf($Old)
    $updated =
        $content.Substring(0, $index) +
        $New +
        $content.Substring($index + $Old.Length)

    Write-TextFile $Path $updated
}

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repo = $scriptDir
$found = $false

for ($i = 0; $i -lt 5; $i++) {
    if (
        (Test-Path (Join-Path $repo "package.json")) -and
        (Test-Path (Join-Path $repo "app")) -and
        (Test-Path (Join-Path $repo ".git"))
    ) {
        $found = $true
        break
    }

    $parent = Split-Path -Parent $repo
    if (!$parent -or $parent -eq $repo) {
        break
    }

    $repo = $parent
}

if (!$found) {
    Fail-V20I2 "Could not locate the Ventic Pro repository. Put these files in the repository root."
}

Set-Location $repo

Write-Host ""
Write-Host "Repository detected:" -ForegroundColor Cyan
Write-Host $repo
Write-Host ""

$registerApi =
    Join-Path $repo "app\api\customer\auth\register\route.ts"
$forgotApi =
    Join-Path $repo "app\api\customer\auth\forgot-password\route.ts"
$resetApi =
    Join-Path $repo "app\api\customer\auth\reset-password\route.ts"
$registerUi =
    Join-Path $repo "app\customer\register\page.tsx"
$forgotUi =
    Join-Path $repo "app\customer\forgot-password\page.tsx"
$guardPath =
    Join-Path $repo "scripts\security-customer-claim-check.mjs"
$packagePath =
    Join-Path $repo "package.json"

foreach ($path in @(
    $registerApi,
    $forgotApi,
    $resetApi,
    $registerUi,
    $forgotUi,
    $packagePath
)) {
    if (!(Test-Path $path)) {
        Fail-V20I2 ("Missing expected file: " + $path)
    }
}

$targetPaths = @(
    "app/api/customer/auth/register/route.ts",
    "app/api/customer/auth/forgot-password/route.ts",
    "app/api/customer/auth/reset-password/route.ts",
    "app/customer/register/page.tsx",
    "app/customer/forgot-password/page.tsx",
    "package.json",
    "scripts/security-customer-claim-check.mjs"
)

$dirty = & git status --porcelain -- $targetPaths
if ($dirty) {
    Fail-V20I2 ("V20I2 target files already have local changes. Commit/stash them first:`n" + ($dirty -join "`n"))
}

$registerCurrent = Read-TextFile $registerApi
$packageCurrent = Read-TextFile $packagePath

if (
    $registerCurrent.Contains("ACCOUNT_ACTIVATION_REQUIRED") -and
    $packageCurrent.Contains("security-customer-claim-check.mjs")
) {
    Write-Host "V20I2 already appears applied." -ForegroundColor Yellow
    exit 0
}

Write-Host "Applying V20I2 Customer Account Claim Lockdown..." -ForegroundColor Cyan

# A Customer row may already hold orders, addresses, invoices and warranties.
# Before V20I2, a row without a password could be claimed just by knowing its phone.
# Block direct registration and force phone ownership proof through the OTP flow.
Replace-Once $registerApi `
'    if (customer?.passwordHash) {' `
@'
    // V20I2: an existing Customer can contain private order data.
    // A first password may only be created after OTP verification.
    if (
      customer &&
      !customer.active
    ) {
      return NextResponse.json(
        {
          error:
            "هذا الحساب غير نشط. تواصل مع Ventic Pro للمراجعة.",
        },
        { status: 403 },
      );
    }

    if (
      customer &&
      !customer.passwordHash
    ) {
      return NextResponse.json(
        {
          code:
            "ACCOUNT_ACTIVATION_REQUIRED",
          error:
            "رقم الموبايل مرتبط بطلب سابق. فعّل الحساب بكود التحقق أولًا.",
        },
        { status: 409 },
      );
    }

    if (customer?.passwordHash) {
'@ `
"insert account-claim block"

# Existing order customers without a password must be eligible for the OTP request.
Replace-Once $forgotApi `
'      !customer.active ||
      !customer.passwordHash' `
'      !customer.active' `
"allow OTP activation"

# The OTP verification endpoint is the only place allowed to set that first password.
Replace-Once $resetApi `
'      !customer.active ||
      !customer.passwordHash' `
'      !customer.active' `
"allow OTP first-password activation"

# Registration UI sends prior-order customers to the OTP verification flow.
Replace-Once $registerUi `
'      if (!response.ok) {
        throw new Error(data?.error || "تعذر إنشاء الحساب");
      }' `
@'
      if (!response.ok) {
        if (
          data?.code ===
          "ACCOUNT_ACTIVATION_REQUIRED"
        ) {
          router.push(
            `/customer/forgot-password?phone=${encodeURIComponent(
              phone,
            )}&activate=1`,
          );
          return;
        }

        throw new Error(data?.error || "تعذر إنشاء الحساب");
      }
'@ `
"registration activation redirect"

# Prefill the customer's phone when redirected from registration.
Replace-Once $forgotUi `
'  useEffect(() => {
    if (countdown <= 0) return;' `
@'
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );
    const presetPhone =
      params.get("phone");

    if (presetPhone) {
      setPhone(presetPhone);
    }
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
'@ `
"prefill activation phone"

# Add a small build-time regression guard.
Write-TextFile $guardPath @'
import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(`${path} is missing.`);
    return "";
  }

  return fs.readFileSync(path, "utf8");
}

const register =
  read("app/api/customer/auth/register/route.ts");
const forgot =
  read("app/api/customer/auth/forgot-password/route.ts");
const reset =
  read("app/api/customer/auth/reset-password/route.ts");
const registerUi =
  read("app/customer/register/page.tsx");

if (
  !register.includes(
    "ACCOUNT_ACTIVATION_REQUIRED",
  )
) {
  failures.push(
    "Existing Customer records must require OTP activation before first password.",
  );
}

if (
  forgot.includes(
    "!customer.passwordHash",
  )
) {
  failures.push(
    "OTP request still rejects prior-order customers without a password.",
  );
}

if (
  reset.includes(
    "!customer.passwordHash",
  )
) {
  failures.push(
    "OTP verification still rejects first-password activation.",
  );
}

if (
  !registerUi.includes(
    "ACCOUNT_ACTIVATION_REQUIRED",
  )
) {
  failures.push(
    "Registration UI does not route existing customers to OTP activation.",
  );
}

if (failures.length) {
  console.error(
    "\nV20I2 customer claim check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }

  process.exit(1);
}

console.log(
  "V20I2 customer account claim check passed.",
);
'@

# Wire the regression guard before the existing V20H guard.
$package = Read-TextFile $packagePath

$oldBuild =
    '"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'
$newBuild =
    '"build": "node scripts/security-customer-claim-check.mjs && node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'

$oldSecurity =
    '"security:check": "node scripts/security-check.mjs && node scripts/security-route-guard.mjs"'
$newSecurity =
    '"security:check": "node scripts/security-check.mjs && node scripts/security-customer-claim-check.mjs && node scripts/security-route-guard.mjs",' +
    [Environment]::NewLine +
    '    "security:customer-claim": "node scripts/security-customer-claim-check.mjs"'

if (!$package.Contains($oldBuild)) {
    Fail-V20I2 "Unexpected package.json build script."
}

if (!$package.Contains($oldSecurity)) {
    Fail-V20I2 "Unexpected package.json security:check script."
}

$package =
    $package.Replace(
        $oldBuild,
        $newBuild
    )

$package =
    $package.Replace(
        $oldSecurity,
        $newSecurity
    )

Write-TextFile $packagePath $package

Write-Host "Running legacy-compatible verification..." -ForegroundColor Cyan

$registerNow = Read-TextFile $registerApi
$forgotNow = Read-TextFile $forgotApi
$resetNow = Read-TextFile $resetApi
$uiNow = Read-TextFile $registerUi
$pkgNow = Read-TextFile $packagePath

$failures = @()

if (!$registerNow.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $failures += "Direct account-claim block is missing."
}

if ($forgotNow.Contains("!customer.passwordHash")) {
    $failures += "OTP request still blocks unclaimed existing customers."
}

if ($resetNow.Contains("!customer.passwordHash")) {
    $failures += "OTP verification still blocks first-password activation."
}

if (!$uiNow.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $failures += "Registration UI activation redirect is missing."
}

if (!$pkgNow.Contains("security-customer-claim-check.mjs")) {
    $failures += "Build-time customer claim guard is missing."
}

if ($failures.Count -gt 0) {
    Write-Host ""
    Write-Host "V20I2 verification FAILED:" -ForegroundColor Red

    foreach ($failure in $failures) {
        Write-Host ("- " + $failure) -ForegroundColor Red
    }

    exit 1
}

& git diff --check

if ($LASTEXITCODE -ne 0) {
    Fail-V20I2 "git diff --check failed."
}

Write-Host ""
Write-Host "V20I2 APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Critical fix:" -ForegroundColor Cyan
Write-Host "- Existing order customers cannot be claimed by knowing only the phone number"
Write-Host "- First password requires the existing OTP verification flow"
Write-Host "- Registration redirects existing customers into OTP activation"
Write-Host "- Phone is prefilled on the activation page"
Write-Host "- Regression guard now runs on every Vercel build"
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20I2 - secure customer account activation"
Write-Host ""
Write-Host "Commit and Push main." -ForegroundColor Yellow
