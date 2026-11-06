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

const execution =
  read("lib/order-execution.ts");
const statusRoute =
  read(
    "app/api/technician/orders/[id]/status/route.ts",
  );
const lifecycle =
  read(
    "lib/order-lifecycle.ts",
  );

for (const marker of [
  "ORDER_NOT_IN_PROGRESS",
  "completion-otp-issue:",
  "completion-otp-order:",
  "completion-otp-actor:",
  "OTP_ATTEMPTS_EXCEEDED:",
  "OTP_ISSUE_LIMIT:",
  "durableRateLimit",
]) {
  if (!execution.includes(marker)) {
    failures.push(
      `order-execution missing ${marker}`,
    );
  }
}

for (const marker of [
  "technicianNextStatus",
  "expectedNext !== status",
]) {
  if (!statusRoute.includes(marker)) {
    failures.push(
      `technician status route missing ${marker}`,
    );
  }
}

for (const marker of [
  "const technicianNext",
  'ASSIGNED: "ON_THE_WAY"',
  'ON_THE_WAY: "ARRIVED"',
  'ARRIVED: "IN_PROGRESS"',
]) {
  if (!lifecycle.includes(marker)) {
    failures.push(
      `order lifecycle missing ${marker}`,
    );
  }
}

if (failures.length) {
  console.error(
    "\nV20M execution integrity check FAILED:\n",
  );
  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }
  process.exit(1);
}

console.log(
  "V20M execution integrity check passed.",
);
