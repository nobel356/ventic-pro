import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(
      `${path} is missing.`,
    );
    return "";
  }

  return fs.readFileSync(
    path,
    "utf8",
  );
}

const requestSecurity =
  read("lib/request-security.ts");
const staffLogin =
  read("app/api/auth/login/route.ts");
const customerLogin =
  read(
    "app/api/customer/auth/login/route.ts",
  );
const forgot =
  read(
    "app/api/customer/auth/forgot-password/route.ts",
  );
const coupon =
  read(
    "app/api/coupons/validate/route.ts",
  );
const estimate =
  read(
    "app/api/public/order-estimate/route.ts",
  );
const schema =
  read("prisma/schema.prisma");

if (
  !requestSecurity.includes(
    "durableRateLimit",
  ) ||
  !requestSecurity.includes(
    'INSERT INTO "SecurityRateLimit"',
  ) ||
  !schema.includes(
    "model SecurityRateLimit",
  )
) {
  failures.push(
    "Durable PostgreSQL rate-limit store is missing.",
  );
}

for (const [
  label,
  source,
  markers,
] of [
  [
    "staff login",
    staffLogin,
    [
      "staff-login-ip:",
      "durableRateLimit",
      "LOGIN_IP_LIMIT",
    ],
  ],
  [
    "customer login",
    customerLogin,
    [
      "customer-login-ip:",
      "durableRateLimit",
    ],
  ],
  [
    "forgot password",
    forgot,
    [
      "password-forgot-phone:",
      "durableRateLimit",
    ],
  ],
  [
    "coupon validation",
    coupon,
    [
      "coupon-validate:",
      "durableRateLimit",
      "10_000_000",
      "code.length > 64",
    ],
  ],
  [
    "public estimate",
    estimate,
    [
      "public-order-estimate:",
      "durableRateLimit",
      ".slice(",
      "10_000_000",
      "1000",
    ],
  ],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(
        `${label} missing ${marker}`,
      );
    }
  }
}

if (failures.length) {
  console.error(
    "\nV20K abuse protection check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20K durable abuse protection check passed.",
);
