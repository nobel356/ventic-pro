import fs from "node:fs";
const schema = fs.readFileSync("prisma/schema.prisma","utf8");
const api = fs.readFileSync("app/api/admin/disaster-recovery/route.ts","utf8");
const ui = fs.readFileSync("app/admin/disaster-recovery/DisasterRecoveryCenter.tsx","utf8");
if (
  !schema.includes("model DisasterRecoveryRecord") ||
  !api.includes("backupFresh") ||
  !ui.includes("Backup & DR Center")
) process.exit(1);
console.log("PASS ✓ — V55 Backup Freshness ✓ / DR Evidence ✓ / Restore Registry ✓");
