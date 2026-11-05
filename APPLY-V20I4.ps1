$ErrorActionPreference = "Stop"

function Read-Normalized {
    param([string]$Path)

    $text =
        [System.IO.File]::ReadAllText(
            $Path,
            [System.Text.Encoding]::UTF8
        )

    return $text.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Write-Utf8 {
    param(
        [string]$Path,
        [string]$Content
    )

    $parent =
        Split-Path -Parent $Path

    if ($parent -and !(Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }

    $utf8 =
        New-Object System.Text.UTF8Encoding($false)

    [System.IO.File]::WriteAllText(
        $Path,
        $Content,
        $utf8
    )
}

function Replace-Once {
    param(
        [string]$Path,
        [string]$Old,
        [string]$New,
        [string]$Label
    )

    $content =
        Read-Normalized $Path

    if (!$content.Contains($Old)) {
        throw (
            "Missing expected base block: " +
            $Label +
            " in " +
            $Path
        )
    }

    $index =
        $content.IndexOf($Old)

    $updated =
        $content.Substring(0, $index) +
        $New +
        $content.Substring(
            $index + $Old.Length
        )

    Write-Utf8 $Path $updated
}

function Restore-Backup {
    if (!$script:BackupReady) {
        return
    }

    foreach ($relative in $script:BackupFiles) {
        $backupPath =
            Join-Path $script:BackupDir $relative

        $targetPath =
            Join-Path $script:Repo $relative

        if (Test-Path $backupPath) {
            $parent =
                Split-Path -Parent $targetPath

            if (!(Test-Path $parent)) {
                New-Item -ItemType Directory -Force -Path $parent | Out-Null
            }

            Copy-Item -Force $backupPath $targetPath
        }
        elseif (Test-Path $targetPath) {
            Remove-Item -Force $targetPath
        }
    }
}

function Fail-V20I4 {
    param([string]$Message)

    Write-Host ""
    Write-Host "V20I4 FAILED: $Message" -ForegroundColor Red

    try {
        Restore-Backup
        Write-Host "Backup restored." -ForegroundColor Yellow
    }
    catch {
        Write-Host "Automatic restore had a problem." -ForegroundColor Red
        Write-Host "Backup is kept at:" -ForegroundColor Yellow
        Write-Host $script:BackupDir -ForegroundColor Yellow
    }

    exit 1
}

$scriptDir =
    Split-Path -Parent $MyInvocation.MyCommand.Path

$repo =
    $scriptDir

$found =
    $false

for ($i = 0; $i -lt 5; $i++) {
    if (
        (Test-Path (Join-Path $repo "package.json")) -and
        (Test-Path (Join-Path $repo "app")) -and
        (Test-Path (Join-Path $repo ".git"))
    ) {
        $found = $true
        break
    }

    $parent =
        Split-Path -Parent $repo

    if (!$parent -or $parent -eq $repo) {
        break
    }

    $repo =
        $parent
}

if (!$found) {
    Write-Host ""
    Write-Host "V20I4 FAILED: Could not locate the Ventic Pro repository." -ForegroundColor Red
    Write-Host "Put APPLY-V20I4.cmd and APPLY-V20I4.ps1 in the repository root." -ForegroundColor Yellow
    exit 1
}

$script:Repo =
    $repo

Set-Location $repo

Write-Host ""
Write-Host "Repository detected:" -ForegroundColor Cyan
Write-Host $repo
Write-Host ""

$baseCommit =
    "ee56d4721a42577097ac9ced741e7cd6e7c93a38"

& git cat-file -e "$baseCommit^{commit}" 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "V20I4 FAILED: Tested V20H5 base commit is not available locally." -ForegroundColor Red
    exit 1
}

& git merge-base --is-ancestor $baseCommit HEAD 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "V20I4 FAILED: Current branch is not based on the tested V20H5 production commit." -ForegroundColor Red
    exit 1
}

$registerRel =
    "app\api\customer\auth\register\route.ts"

$forgotRel =
    "app\api\customer\auth\forgot-password\route.ts"

$resetRel =
    "app\api\customer\auth\reset-password\route.ts"

$packageRel =
    "package.json"

$guardRel =
    "scripts\security-customer-claim-check.mjs"

$script:BackupFiles = @(
    $registerRel,
    $forgotRel,
    $resetRel,
    $packageRel,
    $guardRel
)

$stamp =
    [DateTime]::Now.ToString("yyyyMMdd-HHmmss")

$script:BackupDir =
    Join-Path $repo (".v20i4-backup-" + $stamp)

New-Item -ItemType Directory -Force -Path $script:BackupDir | Out-Null

foreach ($relative in $script:BackupFiles) {
    $source =
        Join-Path $repo $relative

    $dest =
        Join-Path $script:BackupDir $relative

    if (Test-Path $source) {
        $parent =
            Split-Path -Parent $dest

        if (!(Test-Path $parent)) {
            New-Item -ItemType Directory -Force -Path $parent | Out-Null
        }

        Copy-Item -Force $source $dest
    }
}

$script:BackupReady =
    $true

Write-Host "Backup created:" -ForegroundColor DarkGray
Write-Host $script:BackupDir -ForegroundColor DarkGray
Write-Host ""

Write-Host "Resetting only the 4 V20I4 target files to the tested Production base..." -ForegroundColor Cyan

& git restore `
    "--source=$baseCommit" `
    --worktree `
    -- `
    "app/api/customer/auth/register/route.ts" `
    "app/api/customer/auth/forgot-password/route.ts" `
    "app/api/customer/auth/reset-password/route.ts" `
    "package.json"

if ($LASTEXITCODE -ne 0) {
    Fail-V20I4 "Could not restore the tested base files."
}

$registerPath =
    Join-Path $repo $registerRel

$forgotPath =
    Join-Path $repo $forgotRel

$resetPath =
    Join-Path $repo $resetRel

$packagePath =
    Join-Path $repo $packageRel

$guardPath =
    Join-Path $repo $guardRel

Write-Host "Applying the tested server-side account-claim fix..." -ForegroundColor Cyan

Replace-Once `
    $registerPath `
@'
    if (customer?.passwordHash) {
      return NextResponse.json(
        {
          error:
            "يوجد حساب بالفعل بهذا الرقم. استخدم تسجيل الدخول.",
        },
        { status: 409 },
      );
    }
'@ `
@'
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

    // V20I4: an existing Customer may already own private orders,
    // addresses, invoices and warranties. Never attach the first
    // password without OTP verification of the registered phone.
    if (
      customer &&
      !customer.passwordHash
    ) {
      return NextResponse.json(
        {
          code:
            "ACCOUNT_ACTIVATION_REQUIRED",
          error:
            "رقم الموبايل مرتبط بطلب سابق. استخدم «نسيت كلمة المرور» لاستلام كود التحقق وتفعيل الحساب.",
        },
        { status: 409 },
      );
    }

    if (customer?.passwordHash) {
      return NextResponse.json(
        {
          code:
            "ACCOUNT_ALREADY_EXISTS",
          error:
            "يوجد حساب بالفعل بهذا الرقم. استخدم تسجيل الدخول.",
        },
        { status: 409 },
      );
    }
'@ `
    "register account-claim protection"

Replace-Once `
    $forgotPath `
@'
    if (
      !customer ||
      !customer.active ||
      !customer.passwordHash
    ) {
'@ `
@'
    // V20I4: this OTP flow also activates customers that were
    // created by an earlier order and do not have a password yet.
    if (
      !customer ||
      !customer.active
    ) {
'@ `
    "OTP activation eligibility"

Replace-Once `
    $resetPath `
@'
    if (
      !customer ||
      !customer.active ||
      !customer.passwordHash
    ) {
'@ `
@'
    // V20I4: OTP verification is the only supported way to create
    // the first password for a Customer that already owns order data.
    if (
      !customer ||
      !customer.active
    ) {
'@ `
    "OTP first-password verification"

Write-Utf8 $guardPath @'
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
  read(
    "app/api/customer/auth/register/route.ts",
  );

const forgot =
  read(
    "app/api/customer/auth/forgot-password/route.ts",
  );

const reset =
  read(
    "app/api/customer/auth/reset-password/route.ts",
  );

if (
  !register.includes(
    "ACCOUNT_ACTIVATION_REQUIRED",
  )
) {
  failures.push(
    "Registration must block direct claiming of an existing Customer record.",
  );
}

if (
  forgot.includes(
    "!customer.passwordHash",
  )
) {
  failures.push(
    "OTP request must allow an existing Customer without a password.",
  );
}

if (
  reset.includes(
    "!customer.passwordHash",
  )
) {
  failures.push(
    "OTP verification must allow creation of the first password.",
  );
}

if (failures.length) {
  console.error(
    "\nV20I4 customer claim check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20I4 customer account claim check passed.",
);
'@

$package =
    Read-Normalized $packagePath

$oldBuild =
    '"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'

$newBuild =
    '"build": "node scripts/security-customer-claim-check.mjs && node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'

$oldCheck =
    '"security:check": "node scripts/security-check.mjs && node scripts/security-route-guard.mjs"'

$newCheck =
    '"security:check": "node scripts/security-check.mjs && node scripts/security-customer-claim-check.mjs && node scripts/security-route-guard.mjs",' +
    [Environment]::NewLine +
    '    "security:customer-claim": "node scripts/security-customer-claim-check.mjs"'

if (!$package.Contains($oldBuild)) {
    Fail-V20I4 "Unexpected tested-base build script."
}

if (!$package.Contains($oldCheck)) {
    Fail-V20I4 "Unexpected tested-base security:check script."
}

$package =
    $package.Replace(
        $oldBuild,
        $newBuild
    )

$package =
    $package.Replace(
        $oldCheck,
        $newCheck
    )

Write-Utf8 $packagePath $package

Write-Host "Running local static verification..." -ForegroundColor Cyan

$registerNow =
    Read-Normalized $registerPath

$forgotNow =
    Read-Normalized $forgotPath

$resetNow =
    Read-Normalized $resetPath

$packageNow =
    Read-Normalized $packagePath

$failures = @()

if (!$registerNow.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $failures +=
        "Registration account-claim protection is missing."
}

if ($forgotNow.Contains("!customer.passwordHash")) {
    $failures +=
        "OTP request still blocks existing customers without a password."
}

if ($resetNow.Contains("!customer.passwordHash")) {
    $failures +=
        "OTP verification still blocks first-password activation."
}

if (!$packageNow.Contains("security-customer-claim-check.mjs")) {
    $failures +=
        "V20I4 build-time regression guard is missing."
}

if ($failures.Count -gt 0) {
    Fail-V20I4 ($failures -join "; ")
}

& git diff --check

if ($LASTEXITCODE -ne 0) {
    Fail-V20I4 "git diff --check failed."
}

Write-Host ""
Write-Host "V20I4 APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Critical server-side fix:" -ForegroundColor Cyan
Write-Host "- Existing order customers can no longer be claimed using only their phone number"
Write-Host "- The first password now requires the existing OTP verification flow"
Write-Host "- Existing accounts still use normal login"
Write-Host "- V20I4 regression guard runs before every Vercel build"
Write-Host ""
Write-Host "Important:" -ForegroundColor Yellow
Write-Host "For an old customer without a password, the registration page will tell them to use 'Forgot password' to receive the OTP."
Write-Host ""
Write-Host "Backup kept at:" -ForegroundColor DarkGray
Write-Host $script:BackupDir -ForegroundColor DarkGray
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20I4 - secure customer account claim"
Write-Host ""
Write-Host "Commit and Push main." -ForegroundColor Yellow
