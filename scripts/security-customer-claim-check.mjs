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
const order =
  read("app/api/orders/route.ts");

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
  !register.includes(
    "DIRECT_REGISTRATION_BLOCKED",
  ) ||
  !register.includes(
    "PHONE_VERIFICATION_REQUIRED",
  )
) {
  failures.push(
    "Direct password registration must remain blocked before verified phone activation.",
  );
}

if (
  !forgot.includes(
    "FIRST_ACTIVATION_PHONE_REQUIRED",
  ) ||
  !forgot.includes(
    'deliveryMethod === "EMAIL"',
  )
) {
  failures.push(
    "Passwordless customer activation must not accept EMAIL as the first proof of identity.",
  );
}

if (
  !reset.includes(
    "firstActivation",
  ) ||
  !reset.includes(
    "passwordHash",
  ) ||
  !reset.includes(
    "? null",
  )
) {
  failures.push(
    "Phone-verified first activation must create the first password and clear untrusted email.",
  );
}

if (
  order.includes(
    "prisma.customer.upsert",
  ) ||
  !order.includes(
    "existingCustomer?.archivedAt",
  )
) {
  failures.push(
    "Public order must not overwrite or reactivate an existing customer identity.",
  );
}

if (failures.length) {
  console.error(
    "\nV20I/V20P customer claim check FAILED:\n",
  );
  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }
  process.exit(1);
}

console.log(
  "V20I/V20P customer account claim check passed.",
);
