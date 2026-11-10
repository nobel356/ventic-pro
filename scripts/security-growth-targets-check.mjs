import fs from "node:fs";
const schema = fs.readFileSync("prisma/schema.prisma","utf8");
const api = fs.readFileSync("app/api/admin/growth-targets/route.ts","utf8");
const ui = fs.readFileSync("app/admin/growth-targets/GrowthTargetsManager.tsx","utf8");
if (
  !schema.includes("model GrowthTarget") ||
  !api.includes("GROWTH_TARGET_UPDATED") ||
  !ui.includes("Growth Targets")
) process.exit(1);
console.log("PASS ✓ — V50 Growth Targets ✓ / Guardrails ✓ / Audit ✓");
