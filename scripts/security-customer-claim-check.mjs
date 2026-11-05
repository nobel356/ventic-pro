import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(`${path} is missing.`);
    return "";
  }
  return fs.readFileSync(path, "utf8");
}

const register = read("app/api/customer/auth/register/route.ts");
const forgot = read("app/api/customer/auth/forgot-password/route.ts");
const reset = read("app/api/customer/auth/reset-password/route.ts");

if (!register.includes("ACCOUNT_ACTIVATION_REQUIRED")) {
  failures.push("Registration must block direct claiming of an existing Customer record.");
}

if (forgot.includes("!customer.passwordHash")) {
  failures.push("OTP request must allow an existing Customer without a password.");
}

if (reset.includes("!customer.passwordHash")) {
  failures.push("OTP verification must allow creation of the first password.");
}

if (failures.length) {
  console.error("\nV20I4 customer claim check FAILED:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("V20I4 customer account claim check passed.");
