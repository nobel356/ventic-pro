$ErrorActionPreference = "Stop"

function Fail-V20I {
    param([string]$Message)
    Write-Host ""
    Write-Host "V20I FAILED: $Message" -ForegroundColor Red
    Write-Host "No completed-security claim has been made." -ForegroundColor Yellow
    exit 1
}

function Read-TextFile {
    param([string]$Path)
    return [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
}

function Write-TextFile {
    param([string]$Path, [string]$Content)
    $parent = Split-Path -Parent $Path
    if ($parent -and !(Test-Path $parent)) {
        New-Item -ItemType Directory -Force -Path $parent | Out-Null
    }
    $utf8 = New-Object System.Text.UTF8Encoding($false)
    [System.IO.File]::WriteAllText($Path, $Content, $utf8)
}

function Normalize-LF {
    param([string]$Text)
    return $Text.Replace("`r`n", "`n").Replace("`r", "`n")
}

function Assert-Contains {
    param([string]$Path, [string]$Needle, [string]$Label)
    $content = Normalize-LF (Read-TextFile $Path)
    $needleLf = Normalize-LF $Needle
    if (!$content.Contains($needleLf)) {
        Fail-V20I ("Unexpected source in " + $Path + " (" + $Label + "). Refusing to overwrite blindly.")
    }
}

function Replace-Exact {
    param([string]$Path, [string]$Old, [string]$New, [string]$Label)
    $content = Normalize-LF (Read-TextFile $Path)
    $oldLf = Normalize-LF $Old
    $newLf = Normalize-LF $New
    if (!$content.Contains($oldLf)) {
        Fail-V20I ("Missing expected block in " + $Path + " (" + $Label + ").")
    }
    Write-TextFile $Path ($content.Replace($oldLf, $newLf))
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
    if (!$parent -or $parent -eq $repo) { break }
    $repo = $parent
}

if (!$found) {
    Fail-V20I "Could not locate the Ventic Pro repository. Put APPLY-V20I.cmd and APPLY-V20I.ps1 in the repository root."
}

Set-Location $repo

Write-Host ""
Write-Host "Repository detected:" -ForegroundColor Cyan
Write-Host $repo
Write-Host ""

$baseCommit = "ee56d4721a42577097ac9ced741e7cd6e7c93a38"
& git cat-file -e "$baseCommit^{commit}" 2>$null
if ($LASTEXITCODE -ne 0) {
    Fail-V20I "Expected V20H5 production commit is not present locally."
}

& git merge-base --is-ancestor $baseCommit HEAD 2>$null
if ($LASTEXITCODE -ne 0) {
    Fail-V20I "Current branch is not based on the tested V20H5 production commit."
}

$targetPaths = @(
    "app/api/auth/login/route.ts",
    "app/api/coupons/validate/route.ts",
    "app/api/customer/auth/forgot-password/route.ts",
    "app/api/customer/auth/login/route.ts",
    "app/api/customer/auth/register/route.ts",
    "app/api/customer/auth/reset-password/route.ts",
    "app/api/public/order-estimate/route.ts",
    "app/customer/forgot-password/page.tsx",
    "app/customer/register/page.tsx",
    "package.json",
    "scripts/security-customer-auth-check.mjs"
)

$dirty = & git status --porcelain -- $targetPaths
if ($dirty) {
    Fail-V20I ("V20I target files already have local changes. Commit/stash them first:`n" + ($dirty -join "`n"))
}

$registerPath = Join-Path $repo "app\api\customer\auth\register\route.ts"
$packagePath = Join-Path $repo "package.json"

$currentRegister = Normalize-LF (Read-TextFile $registerPath)
$currentPackage = Normalize-LF (Read-TextFile $packagePath)

if (
    $currentRegister.Contains("ACCOUNT_ACTIVATION_REQUIRED") -and
    $currentPackage.Contains("security-customer-auth-check.mjs")
) {
    Write-Host "V20I already appears to be applied." -ForegroundColor Yellow
    Write-Host "Run git status and commit/push if needed." -ForegroundColor Yellow
    exit 0
}

Write-Host "Preflight checks..." -ForegroundColor Cyan

Assert-Contains $registerPath @'
    if (customer?.passwordHash) {
'@ "pre-V20I registration flow"

Assert-Contains (Join-Path $repo "app\api\customer\auth\forgot-password\route.ts") @'
      !customer.passwordHash
'@ "pre-V20I forgot-password eligibility"

Assert-Contains (Join-Path $repo "app\api\customer\auth\reset-password\route.ts") @'
      !customer.passwordHash
'@ "pre-V20I reset-password eligibility"

Assert-Contains (Join-Path $repo "app\api\auth\login\route.ts") @'
  const rateKey = `staff-login:${ip}:${identifier || "empty"}`;
'@ "staff per-identifier rate limit"

Assert-Contains (Join-Path $repo "app\api\customer\auth\login\route.ts") @'
    const key = `customer-login:${clientIp(req)}:${phone || "empty"}`;
'@ "customer per-phone rate limit"

Assert-Contains $packagePath @'
"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"
'@ "V20H5 build script"

Write-Host "Applying V20I Customer Account Claim Lockdown..." -ForegroundColor Cyan

# 1) Block direct claiming of existing Customer records.
Replace-Exact $registerPath @'
    if (customer?.passwordHash) {
      return NextResponse.json(
        {
          error:
            "يوجد حساب بالفعل بهذا الرقم. استخدم تسجيل الدخول.",
        },
        { status: 409 },
      );
    }

    const passwordHash =
      hashPassword(password);

    if (customer) {
      customer =
        await prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            name,
            email,
            passwordHash,
            active: true,
          },
        });
    } else {
      customer =
        await prisma.customer.create({
          data: {
            name,
            phone,
            email,
            passwordHash,
            active: true,
          },
        });
    }
'@ @'
    // V20I: a pre-existing Customer may contain orders, addresses,
    // invoices and aftercare data. Never let a password be attached
    // to that record without first proving control of the phone by OTP.
    if (customer) {
      if (!customer.active) {
        return NextResponse.json(
          {
            error:
              "هذا الحساب غير نشط. تواصل مع Ventic Pro للمراجعة.",
          },
          { status: 403 },
        );
      }

      if (customer.passwordHash) {
        return NextResponse.json(
          {
            code: "ACCOUNT_ALREADY_EXISTS",
            error:
              "يوجد حساب بالفعل بهذا الرقم. استخدم تسجيل الدخول.",
          },
          { status: 409 },
        );
      }

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

    const passwordHash =
      hashPassword(password);

    customer =
      await prisma.customer.create({
        data: {
          name,
          phone,
          email,
          passwordHash,
          active: true,
        },
      });
'@ "customer account claim"

# 2) Forgot-password becomes secure activation for prior-order customers.
$forgotPath = Join-Path $repo "app\api\customer\auth\forgot-password\route.ts"

Replace-Exact $forgotPath @'
const GENERIC_MESSAGE =
  "إذا كان الرقم مرتبطًا بحساب Ventic Pro فسيصلك كود استعادة كلمة المرور.";
'@ @'
const GENERIC_MESSAGE =
  "إذا كان الرقم مرتبطًا بحساب أو طلب سابق في Ventic Pro فسيصلك كود تحقق.";
'@ "generic OTP message"

Replace-Exact $forgotPath @'
    if (
      !customer ||
      !customer.active ||
      !customer.passwordHash
    ) {
'@ @'
    // V20I: customers created by a previous order may not have a
    // password yet. They must use this OTP flow to activate the account.
    if (
      !customer ||
      !customer.active
    ) {
'@ "allow secure activation"

Replace-Exact $forgotPath @'
    const otp =
      newCustomerResetCode();
'@ @'
    const activating =
      !customer.passwordHash;

    const otp =
      newCustomerResetCode();
'@ "activation flag"

Replace-Exact $forgotPath @'
        templateKey:
          "CUSTOMER_PASSWORD_RESET",
'@ @'
        templateKey:
          activating
            ? "CUSTOMER_ACCOUNT_ACTIVATION"
            : "CUSTOMER_PASSWORD_RESET",
'@ "activation notification"

Replace-Exact $forgotPath @'
        action:
          "CUSTOMER_PASSWORD_RESET_REQUESTED",
'@ @'
        action:
          activating
            ? "CUSTOMER_ACCOUNT_ACTIVATION_REQUESTED"
            : "CUSTOMER_PASSWORD_RESET_REQUESTED",
'@ "activation audit"

# 3) OTP reset can securely attach the first password.
$resetPath = Join-Path $repo "app\api\customer\auth\reset-password\route.ts"

Replace-Exact $resetPath @'
    if (
      !customer ||
      !customer.active ||
      !customer.passwordHash
    ) {
'@ @'
    // V20I: this OTP flow is also the only allowed way to attach
    // the first password to a Customer created by an earlier order.
    if (
      !customer ||
      !customer.active
    ) {
'@ "OTP first-password eligibility"

Replace-Exact $resetPath @'
    const reset =
      await prisma.customerPasswordReset.findFirst({
'@ @'
    const activating =
      !customer.passwordHash;

    const reset =
      await prisma.customerPasswordReset.findFirst({
'@ "reset activation flag"

Replace-Exact $resetPath @'
            action:
              "CUSTOMER_PASSWORD_RESET_COMPLETED",
'@ @'
            action:
              activating
                ? "CUSTOMER_ACCOUNT_ACTIVATED"
                : "CUSTOMER_PASSWORD_RESET_COMPLETED",
'@ "activation audit completion"

Replace-Exact $resetPath @'
      message:
        "تم تغيير كلمة المرور. يمكنك تسجيل الدخول بكلمة المرور الجديدة.",
'@ @'
      message:
        activating
          ? "تم تفعيل حسابك. يمكنك تسجيل الدخول الآن."
          : "تم تغيير كلمة المرور. يمكنك تسجيل الدخول بكلمة المرور الجديدة.",
'@ "activation success message"

# 4) Registration UI routes prior-order customers to OTP activation.
$registerUi = Join-Path $repo "app\customer\register\page.tsx"

Replace-Exact $registerUi @'
      if (!response.ok) {
        throw new Error(data?.error || "تعذر إنشاء الحساب");
      }

      router.push("/customer/account");
'@ @'
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

      router.push("/customer/account");
'@ "registration activation redirect"

Replace-Exact $registerUi @'
        <p style={{ textAlign: "center", marginTop: 18 }}>
          لديك حساب بالفعل؟ <Link href="/customer/login">تسجيل الدخول</Link>
        </p>
'@ @'
        <p style={{ textAlign: "center", marginTop: 18 }}>
          لديك حساب بالفعل؟ <Link href="/customer/login">تسجيل الدخول</Link>
        </p>

        <p style={{ textAlign: "center", marginTop: 8, color: "#64748b" }}>
          سبق وقدمت طلبًا بنفس الرقم؟{" "}
          <Link href="/customer/forgot-password?activate=1">
            فعّل حسابك بكود التحقق
          </Link>
        </p>
'@ "activation link"

# 5) Forgot-password UI becomes activation-aware.
$forgotUi = Join-Path $repo "app\customer\forgot-password\page.tsx"

Replace-Exact $forgotUi @'
  const [loading, setLoading] =
    useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
'@ @'
  const [loading, setLoading] =
    useState(false);
  const [activationMode, setActivationMode] =
    useState(false);

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

    setActivationMode(
      params.get("activate") === "1",
    );
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
'@ "activation query mode"

Replace-Exact $forgotUi @'
          نسيت كلمة المرور
'@ @'
          {activationMode
            ? "تفعيل حسابك"
            : "نسيت كلمة المرور"}
'@ "activation title"

Replace-Exact $forgotUi @'
              اكتب رقم الموبايل المسجل بالحساب وسنرسل لك كود استعادة.
'@ @'
              {activationMode
                ? "إذا سبق وقدمت طلبًا بهذا الرقم، سنرسل كود تحقق قبل إنشاء كلمة المرور الأولى."
                : "اكتب رقم الموبايل المسجل بالحساب وسنرسل لك كود استعادة."}
'@ "activation instructions"

Replace-Exact $forgotUi @'
              {loading
                ? "جاري الإرسال..."
                : "إرسال كود الاستعادة"}
'@ @'
              {loading
                ? "جاري الإرسال..."
                : activationMode
                  ? "إرسال كود التفعيل"
                  : "إرسال كود الاستعادة"}
'@ "activation button"

Replace-Exact $forgotUi @'
              أدخل الكود الذي وصلك ثم اختر كلمة مرور جديدة.
'@ @'
              {activationMode
                ? "أدخل كود التحقق ثم اختر كلمة مرور لحسابك."
                : "أدخل الكود الذي وصلك ثم اختر كلمة مرور جديدة."}
'@ "activation reset instructions"

Replace-Exact $forgotUi @'
              تم تغيير كلمة المرور ✓
'@ @'
              {activationMode
                ? "تم تفعيل الحساب ✓"
                : "تم تغيير كلمة المرور ✓"}
'@ "activation completion title"

# 6) Add IP-wide login throttles to prevent identifier rotation bypass.
$staffLogin = Join-Path $repo "app\api\auth\login\route.ts"

Replace-Exact $staffLogin @'
  const ip = clientIp(req);
  const rateKey = `staff-login:${ip}:${identifier || "empty"}`;
  const limited = rateLimit(rateKey, {
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  if (!limited.allowed) {
'@ @'
  const ip = clientIp(req);
  const ipRateKey =
    `staff-login-ip:${ip}`;
  const rateKey =
    `staff-login:${ip}:${identifier || "empty"}`;

  const ipLimited = rateLimit(
    ipRateKey,
    {
      limit: 30,
      windowMs: LOGIN_WINDOW_MS,
    },
  );
  const limited = rateLimit(rateKey, {
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  // V20I: the IP-wide bucket prevents bypassing the limit by
  // rotating usernames while preserving the tighter per-account limit.
  if (
    !ipLimited.allowed ||
    !limited.allowed
  ) {
'@ "staff IP-wide throttle"

Replace-Exact $staffLogin @'
        headers: rateLimitHeaders(limited),
'@ @'
        headers: rateLimitHeaders(
          !ipLimited.allowed
            ? ipLimited
            : limited,
        ),
'@ "staff throttle headers"

$customerLogin = Join-Path $repo "app\api\customer\auth\login\route.ts"

Replace-Exact $customerLogin @'
    const key = `customer-login:${clientIp(req)}:${phone || "empty"}`;
    const limited = rateLimit(key, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!limited.allowed) {
'@ @'
    const ip =
      clientIp(req);
    const ipKey =
      `customer-login-ip:${ip}`;
    const key =
      `customer-login:${ip}:${phone || "empty"}`;

    const ipLimited = rateLimit(
      ipKey,
      {
        limit: 30,
        windowMs:
          15 * 60 * 1000,
      },
    );
    const limited = rateLimit(key, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    // V20I: keep an IP-wide bucket so rotating phone numbers
    // cannot bypass the tighter per-phone login limit.
    if (
      !ipLimited.allowed ||
      !limited.allowed
    ) {
'@ "customer IP-wide throttle"

Replace-Exact $customerLogin @'
          headers:
            rateLimitHeaders(limited),
'@ @'
          headers:
            rateLimitHeaders(
              !ipLimited.allowed
                ? ipLimited
                : limited,
            ),
'@ "customer throttle headers"

# 7) Rewrite coupon validation with rate limiting and bounded inputs.
$couponPath = Join-Path $repo "app\api\coupons\validate\route.ts"
Write-TextFile $couponPath @'
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

export async function POST(
  req: Request,
) {
  const limited = rateLimit(
    `coupon-validate:${clientIp(req)}`,
    {
      limit: 60,
      windowMs:
        15 * 60 * 1000,
    },
  );

  if (!limited.allowed) {
    return NextResponse.json(
      {
        valid: false,
        discount: 0,
        error:
          "محاولات كثيرة. حاول لاحقًا.",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(
            limited,
          ),
      },
    );
  }

  const body = await req.json();
  const code = String(
    body?.code || "",
  )
    .trim()
    .toUpperCase()
    .slice(0, 64);
  const subtotal = Number(
    body?.subtotal || 0,
  );

  if (
    !code ||
    !Number.isFinite(subtotal) ||
    subtotal < 0 ||
    subtotal > 10_000_000
  ) {
    return NextResponse.json({
      valid: false,
      discount: 0,
    });
  }

  const coupon =
    await prisma.coupon.findUnique({
      where: { code },
    });
  const now = new Date();

  if (
    !coupon ||
    !coupon.active ||
    (coupon.startsAt &&
      coupon.startsAt > now) ||
    (coupon.endsAt &&
      coupon.endsAt < now) ||
    (coupon.maxUses &&
      coupon.usedCount >=
        coupon.maxUses) ||
    subtotal <
      Number(
        coupon.minOrder || 0,
      )
  ) {
    return NextResponse.json({
      valid: false,
      discount: 0,
    });
  }

  const discount =
    coupon.type === "PERCENT"
      ? (subtotal *
          Number(coupon.value)) /
        100
      : Number(coupon.value);

  return NextResponse.json({
    valid: true,
    discount: Math.min(
      subtotal,
      discount,
    ),
    code: coupon.code,
  });
}
'@

# 8) Harden public estimator.
$estimatePath = Join-Path $repo "app\api\public\order-estimate\route.ts"

Replace-Exact $estimatePath @'
import { calculateOrderOffer } from "@/lib/promotions";
'@ @'
import { calculateOrderOffer } from "@/lib/promotions";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";
'@ "estimator security imports"

Replace-Exact $estimatePath @'
export async function POST(req: Request) {
  try {
    const body = await req.json();
'@ @'
export async function POST(req: Request) {
  try {
    const limited = rateLimit(
      `public-estimate:${clientIp(req)}`,
      {
        limit: 120,
        windowMs:
          15 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        {
          error:
            "محاولات كثيرة. حاول لاحقًا.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(
              limited,
            ),
        },
      );
    }

    const body = await req.json();
'@ "estimator rate limit"

Replace-Exact $estimatePath @'
    const rawLines = Array.isArray(body?.serviceLines)
      ? body.serviceLines
      : [];
'@ @'
    const rawLines = Array.isArray(body?.serviceLines)
      ? body.serviceLines.slice(0, 50)
      : [];
'@ "estimator line cap"

Replace-Exact $estimatePath @'
        qty: Math.max(0, Number(line?.qty || 0)),
'@ @'
        qty: Math.min(
          1000,
          Math.max(
            0,
            Number(line?.qty || 0),
          ),
        ),
'@ "estimator quantity cap"

Replace-Exact $estimatePath @'
    let subtotal = Math.max(0, Number(body?.subtotal || 0));
'@ @'
    let subtotal = Math.min(
      10_000_000,
      Math.max(
        0,
        Number(body?.subtotal || 0),
      ),
    );

    if (!Number.isFinite(subtotal)) {
      subtotal = 0;
    }
'@ "estimator subtotal cap"

Replace-Exact $estimatePath @'
      ? body.serviceCodes.map((value: unknown) =>
          String(value || "").trim().toUpperCase(),
        )
      : [];
'@ @'
      ? body.serviceCodes
          .slice(0, 50)
          .map((value: unknown) =>
            String(value || "")
              .trim()
              .toUpperCase()
              .slice(0, 64),
          )
      : [];
'@ "estimator service-code cap"

# 9) Build-time regression guard.
$securityGuardPath = Join-Path $repo "scripts\security-customer-auth-check.mjs"
Write-TextFile $securityGuardPath @'
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

function requireText(
  path,
  content,
  marker,
  message,
) {
  if (!content.includes(marker)) {
    failures.push(
      `${path}: ${message}`,
    );
  }
}

const registerPath =
  "app/api/customer/auth/register/route.ts";
const register =
  read(registerPath);
requireText(
  registerPath,
  register,
  "ACCOUNT_ACTIVATION_REQUIRED",
  "existing Customer records must require OTP activation before a password can be attached.",
);
requireText(
  registerPath,
  register,
  "Never let a password be attached",
  "V20I account-claim protection marker is missing.",
);

const forgotPath =
  "app/api/customer/auth/forgot-password/route.ts";
const forgot =
  read(forgotPath);
requireText(
  forgotPath,
  forgot,
  "CUSTOMER_ACCOUNT_ACTIVATION_REQUESTED",
  "forgot-password must support secure activation of prior-order customers.",
);

const resetPath =
  "app/api/customer/auth/reset-password/route.ts";
const reset =
  read(resetPath);
requireText(
  resetPath,
  reset,
  "CUSTOMER_ACCOUNT_ACTIVATED",
  "OTP reset must be able to create the first password securely.",
);

const staffLoginPath =
  "app/api/auth/login/route.ts";
const staffLogin =
  read(staffLoginPath);
requireText(
  staffLoginPath,
  staffLogin,
  "staff-login-ip:",
  "staff login must retain an IP-wide rate-limit bucket.",
);

const customerLoginPath =
  "app/api/customer/auth/login/route.ts";
const customerLogin =
  read(customerLoginPath);
requireText(
  customerLoginPath,
  customerLogin,
  "customer-login-ip:",
  "customer login must retain an IP-wide rate-limit bucket.",
);

for (const path of [
  "app/api/coupons/validate/route.ts",
  "app/api/public/order-estimate/route.ts",
]) {
  const content = read(path);
  requireText(
    path,
    content,
    "rateLimit(",
    "DB-backed public endpoint must remain rate-limited.",
  );
}

const registerUiPath =
  "app/customer/register/page.tsx";
const registerUi =
  read(registerUiPath);
requireText(
  registerUiPath,
  registerUi,
  "ACCOUNT_ACTIVATION_REQUIRED",
  "registration UI must route existing-order customers into OTP activation.",
);

if (failures.length) {
  console.error(
    "\nV20I customer security check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20I customer account security check passed.",
);
'@

# 10) Wire V20I guard into Vercel builds.
$pkg = Normalize-LF (Read-TextFile $packagePath)

$oldBuild = '"build": "node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'
$newBuild = '"build": "node scripts/security-customer-auth-check.mjs && node scripts/security-route-guard.mjs && prisma generate && node scripts/production-migrate.mjs && next build"'

$oldCheck = '"security:check": "node scripts/security-check.mjs && node scripts/security-route-guard.mjs"'
$newCheck = '"security:check": "node scripts/security-check.mjs && node scripts/security-customer-auth-check.mjs && node scripts/security-route-guard.mjs",' + [Environment]::NewLine + '    "security:customer-auth": "node scripts/security-customer-auth-check.mjs"'

if (!$pkg.Contains($oldBuild)) {
    Fail-V20I "Unexpected build script while wiring V20I guard."
}
if (!$pkg.Contains($oldCheck)) {
    Fail-V20I "Unexpected security:check script while wiring V20I guard."
}

$pkg = $pkg.Replace($oldBuild, $newBuild)
$pkg = $pkg.Replace($oldCheck, $newCheck)
Write-TextFile $packagePath $pkg

Write-Host "Running legacy-compatible V20I verification..." -ForegroundColor Cyan

$registerNow = Normalize-LF (Read-TextFile $registerPath)
$forgotNow = Normalize-LF (Read-TextFile $forgotPath)
$resetNow = Normalize-LF (Read-TextFile $resetPath)
$staffNow = Normalize-LF (Read-TextFile $staffLogin)
$customerNow = Normalize-LF (Read-TextFile $customerLogin)
$couponNow = Normalize-LF (Read-TextFile $couponPath)
$estimateNow = Normalize-LF (Read-TextFile $estimatePath)
$pkgNow = Normalize-LF (Read-TextFile $packagePath)

$failures = @()
if (!$registerNow.Contains("ACCOUNT_ACTIVATION_REQUIRED")) { $failures += "Account claim block missing." }
if (!$forgotNow.Contains("CUSTOMER_ACCOUNT_ACTIVATION_REQUESTED")) { $failures += "OTP activation request missing." }
if (!$resetNow.Contains("CUSTOMER_ACCOUNT_ACTIVATED")) { $failures += "OTP activation completion missing." }
if (!$staffNow.Contains("staff-login-ip:")) { $failures += "Staff IP throttle missing." }
if (!$customerNow.Contains("customer-login-ip:")) { $failures += "Customer IP throttle missing." }
if (!$couponNow.Contains("rateLimit(")) { $failures += "Coupon rate limit missing." }
if (!$estimateNow.Contains("rateLimit(")) { $failures += "Estimator rate limit missing." }
if (!$pkgNow.Contains("security-customer-auth-check.mjs")) { $failures += "Build-time V20I guard missing." }

if ($failures.Count -gt 0) {
    Write-Host "V20I verification FAILED:" -ForegroundColor Red
    foreach ($failure in $failures) {
        Write-Host ("- " + $failure) -ForegroundColor Red
    }
    exit 1
}

& git diff --check
if ($LASTEXITCODE -ne 0) {
    Fail-V20I "git diff --check failed."
}

Write-Host ""
Write-Host "V20I APPLIED SUCCESSFULLY" -ForegroundColor Green
Write-Host ""
Write-Host "Critical protection:" -ForegroundColor Cyan
Write-Host "- Existing order customers can no longer be claimed by setting a password directly"
Write-Host "- First password now requires OTP verification"
Write-Host "- Registration routes prior-order customers into activation"
Write-Host "- Staff/customer login use IP-wide plus account-specific throttles"
Write-Host "- Coupon and public estimate endpoints are rate-limited and bounded"
Write-Host "- V20I regression guard is wired into every Vercel build"
Write-Host ""
Write-Host "Commit message:" -ForegroundColor Cyan
Write-Host "V20I - customer account claim lockdown"
Write-Host ""
Write-Host "Commit and Push main. Vercel will run V20I + V20H guards and TypeScript build." -ForegroundColor Yellow
