$ErrorActionPreference = "Stop"

function Fail-V20I3 {
    param([string]$Message)

    Write-Host ""
    Write-Host "V20I3 FAILED: $Message" -ForegroundColor Red
    Write-Host "The installer will restore its backup when possible." -ForegroundColor Yellow

    if ($script:BackupReady -and $script:BackupDir) {
        try {
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

            Write-Host "Backup restored." -ForegroundColor Yellow
        }
        catch {
            Write-Host "Automatic restore had a problem. Backup is kept at:" -ForegroundColor Red
            Write-Host $script:BackupDir -ForegroundColor Yellow
        }
    }

    exit 1
}

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

    $parent = Split-Path -Parent $Path

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
        Fail-V20I3 (
            "Missing expected marker in " +
            $Path +
            " (" +
            $Label +
            ")."
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

function Remove-Regex-Once {
    param(
        [string]$Path,
        [string]$Pattern,
        [string]$Label
    )

    $content =
        Read-Normalized $Path

    $regex =
        New-Object System.Text.RegularExpressions.Regex(
            $Pattern,
            [System.Text.RegularExpressions.RegexOptions]::Singleline
        )

    if (!$regex.IsMatch($content)) {
        Fail-V20I3 (
            "Could not find the expected condition in " +
            $Path +
            " (" +
            $Label +
            ")."
        )
    }

    $updated =
        $regex.Replace(
            $content,
            "",
            1
        )

    Write-Utf8 $Path $updated
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
    Write-Host "V20I3 FAILED: Could not locate the Ventic Pro repository." -ForegroundColor Red
    Write-Host "Put APPLY-V20I3.cmd and APPLY-V20I3.ps1 in the repository root." -ForegroundColor Yellow
    exit 1
}

$script:Repo =
    $repo

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

$script:BackupFiles = @(
    "app\api\customer\auth\register\route.ts",
    "app\api\customer\auth\forgot-password\route.ts",
    "app\api\customer\auth\reset-password\route.ts",
    "app\customer\register\page.tsx",
    "app\customer\forgot-password\page.tsx",
    "package.json",
    "scripts\security-customer-claim-check.mjs"
)

foreach ($path in @(
    $registerApi,
    $forgotApi,
    $resetApi,
    $registerUi,
    $forgotUi,
    $packagePath
)) {
    if (!(Test-Path $path)) {
        Write-Host ""
        Write-Host "V20I3 FAILED: Missing expected file:" -ForegroundColor Red
        Write-Host $path -ForegroundColor Yellow
        exit 1
    }
}

# V20I3 intentionally allows the known partial state left by V20I2.
# It backs up the current local files first and applies only missing pieces.
$stamp =
    [DateTime]::Now.ToString("yyyyMMdd-HHmmss")

$script:BackupDir =
    Join-Path $repo (".v20i3-backup-" + $stamp)

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

Write-Host "Applying V20I3 Customer Account Claim Lockdown..." -ForegroundColor Cyan

# 1. Prevent direct claiming of an existing Customer row.
$register =
    Read-Normalized $registerApi

if (!$register.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $marker =
        '    if (customer?.passwordHash) {'

    $block = @'
    // V20I3: an existing Customer can contain private order data.
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

'@

    Replace-Once `
        $registerApi `
        $marker `
        ($block + $marker) `
        "account claim protection"
}

# 2. Existing order customers without a password must be eligible for OTP.
$forgot =
    Read-Normalized $forgotApi

if ($forgot.Contains("!customer.passwordHash")) {
    Remove-Regex-Once `
        $forgotApi `
        '\s*\|\|\s*!customer\.passwordHash' `
        "OTP activation eligibility"
}

# 3. OTP verification must be allowed to set the first password.
$reset =
    Read-Normalized $resetApi

if ($reset.Contains("!customer.passwordHash")) {
    Remove-Regex-Once `
        $resetApi `
        '\s*\|\|\s*!customer\.passwordHash' `
        "first-password OTP verification"
}

# 4. Registration UI redirects existing order customers into OTP activation.
$registerPage =
    Read-Normalized $registerUi

if (!$registerPage.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $throwMarker =
        '        throw new Error(data?.error || "تعذر إنشاء الحساب");'

    $replacement = @'
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
'@

    Replace-Once `
        $registerUi `
        $throwMarker `
        $replacement `
        "registration activation redirect"
}

# 5. Prefill the phone on the activation/forgot-password page.
$forgotPage =
    Read-Normalized $forgotUi

if (!$forgotPage.Contains('params.get("phone")')) {
    $effectMarker = @'
  useEffect(() => {
    if (countdown <= 0) return;
'@

    $prefill = @'
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
'@

    Replace-Once `
        $forgotUi `
        $effectMarker `
        $prefill `
        "activation phone prefill"
}

# 6. Add a build-time regression guard.
Write-Utf8 $guardPath @'
import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(`${path} is missing.`);
    return "";
  }

  return fs.readFileSync(
    path,
    "utf8",
  );
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

const registerUi =
  read(
    "app/customer/register/page.tsx",
  );

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
    "\nV20I3 customer claim check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20I3 customer account claim check passed.",
);
'@

# 7. Wire the V20I3 regression guard into Vercel builds.
$package =
    Read-Normalized $packagePath

if (!$package.Contains("security-customer-claim-check.mjs")) {
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
        Fail-V20I3 "Unexpected package.json build script."
    }

    if (!$package.Contains($oldCheck)) {
        Fail-V20I3 "Unexpected package.json security:check script."
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
}

Write-Host "Running local verification..." -ForegroundColor Cyan

$registerNow =
    Read-Normalized $registerApi

$forgotNow =
    Read-Normalized $forgotApi

$resetNow =
    Read-Normalized $resetApi

$registerUiNow =
    Read-Normalized $registerUi

$forgotUiNow =
    Read-Normalized $forgotUi

$packageNow =
    Read-Normalized $packagePath

$failures = @()

if (!$registerNow.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $failures +=
        "Account claim protection is missing."
}

if ($forgotNow.Contains("!customer.passwordHash")) {
    $failures +=
        "OTP request still blocks existing customers without a password."
}

if ($resetNow.Contains("!customer.passwordHash")) {
    $failures +=
        "OTP verification still blocks first-password activation."
}

if (!$registerUiNow.Contains("ACCOUNT_ACTIVATION_REQUIRED")) {
    $failures +=
        "Registration activation redirect is missing."
}

if (!$forgotUiNow.Contains('params.get("phone")')) {
    $failures +=
        "Activation phone prefill is missing."
}

if (!$packageNow.Contains("security-customer-claim-check.mjs")) {
    $failures +=
        "Build-time customer claim guard is missing."
}

if ($failures.Count -gt 0) {
    $details =
        $failures -join "; "

    Fail-V20I3 $details
}

& git diff --check

if ($LASTEXITCODE -ne 0) {
    Fail-V20I3 "git diff --check failed."
}

Write-Host ""
Write-Host "V20I3 APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Critical protection completed:" -ForegroundColor Cyan
Write-Host "- Existing order customers cannot be claimed using only their phone number"
Write-Host "- First password now requires OTP verification"
Write-Host "- Registration redirects existing customers into OTP activation"
Write-Host "- Activation page prefills the phone number"
Write-Host "- Vercel build now contains a regression guard for this protection"
Write-Host ""
Write-Host "Backup kept at:" -ForegroundColor DarkGray
Write-Host $script:BackupDir -ForegroundColor DarkGray
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20I3 - secure customer account activation"
Write-Host ""
Write-Host "Commit and Push main." -ForegroundColor Yellow
