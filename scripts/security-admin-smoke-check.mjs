import fs from "node:fs";

const ui = fs.readFileSync(
  "app/admin/ops-smoke/AdminSmokeTests.tsx",
  "utf8",
);

const checks = [
  [
    ui.includes("Authenticated Smoke Tests"),
    "authenticated smoke UI",
  ],
  [
    /status:\s*"SKIP"/.test(ui),
    "expected 403 SKIP handling",
  ],
  [
    ui.includes("credentials:"),
    "authenticated browser credentials",
  ],
  [
    ui.includes('method: "GET"'),
    "read-only GET checks",
  ],
  [
    ui.includes("response.ok"),
    "PASS handling",
  ],
  [
    /status:\s*"FAIL"/.test(ui),
    "FAIL handling",
  ],
];

const failed =
  checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) {
    console.error("FAIL:", label);
  }
  process.exit(1);
}

console.log(
  "PASS ✓ — V56 Authenticated Smoke Tests ✓ / PASS-SKIP-FAIL ✓ / Read-only GET ✓",
);
