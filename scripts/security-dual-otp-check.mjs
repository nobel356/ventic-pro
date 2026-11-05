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

const messaging =
  read(
    "lib/customer-messaging.ts",
  );
const forgotApi =
  read(
    "app/api/customer/auth/forgot-password/route.ts",
  );
const forgotPage =
  read(
    "app/customer/forgot-password/page.tsx",
  );

for (const marker of [
  'preferredChannel?:',
  '"PHONE"',
  '"EMAIL"',
  'input.preferredChannel ===',
]) {
  if (!messaging.includes(marker)) {
    failures.push(
      `customer-messaging missing ${marker}`,
    );
  }
}

if (
  !forgotApi.includes(
    'body?.deliveryMethod ===',
  ) ||
  !forgotApi.includes(
    'preferredChannel:',
  ) ||
  !forgotApi.includes(
    '"EMAIL"',
  )
) {
  failures.push(
    "forgot-password API must preserve explicit PHONE/EMAIL delivery choice.",
  );
}

if (
  !forgotPage.includes(
    'deliveryMethod',
  ) ||
  !forgotPage.includes(
    'على الموبايل',
  ) ||
  !forgotPage.includes(
    'على الإيميل',
  )
) {
  failures.push(
    "forgot-password UI must expose both OTP channels.",
  );
}

if (failures.length) {
  console.error(
    "\nV20J dual OTP check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20J dual OTP channel check passed.",
);
