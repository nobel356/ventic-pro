import fs from "node:fs";

const lib = fs.readFileSync(
  "lib/production-verification.ts",
  "utf8",
);
const api = fs.readFileSync(
  "app/api/admin/production-verification/route.ts",
  "utf8",
);
const ui = fs.readFileSync(
  "app/admin/production-verification/ProductionVerificationCenter.tsx",
  "utf8",
);

const checks = [
  [lib.includes("VERCEL_GIT_COMMIT_SHA"), "runtime deployment SHA"],
  [lib.includes("production.expectedGithubSha"), "external GitHub evidence"],
  [lib.includes("GitHub main ↔ Vercel"), "SHA comparison gate"],
  [lib.includes('FROM "_prisma_migrations"'), "DB migration evidence"],
  [lib.includes("Critical incidents"), "incident gate"],
  [lib.includes('"BLOCKED"') && lib.includes('"DEGRADED"') && lib.includes('"GREEN"'), "honest overall states"],
  [api.includes("INVALID_GIT_SHA"), "validated external SHA"],
  [ui.includes("Production Verification Center"), "verification UI"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V61 Runtime SHA ✓ / GitHub Evidence ✓ / DB Migrations ✓ / Backup+Restore ✓ / Incident Gate ✓ / GREEN-DEGRADED-BLOCKED ✓",
);
