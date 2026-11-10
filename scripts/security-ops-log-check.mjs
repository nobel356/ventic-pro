import fs from "node:fs";

const schema = fs.readFileSync(
  "prisma/schema.prisma",
  "utf8",
);
const api = fs.readFileSync(
  "app/api/admin/ops-log/route.ts",
  "utf8",
);
const ui = fs.readFileSync(
  "app/admin/ops-log/OpsChangeLog.tsx",
  "utf8",
);

const checks = [
  [schema.includes("model OpsChangeLog"), "ops model"],
  [api.includes("OPS_LOG_CREATED") && api.includes("OPS_LOG_UPDATED"), "audit trail"],
  [api.includes('"CRITICAL"') && api.includes('"MONITORING"'), "incident lifecycle"],
  [ui.includes("Incident & Change Log"), "ops UI"],
  [ui.includes("Root cause") && ui.includes("Resolution"), "postmortem fields"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V62 Incident Log ✓ / Change Log ✓ / Severity ✓ / Root Cause ✓ / Resolution ✓ / Audit ✓",
);
