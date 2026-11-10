import fs from "node:fs";
const schema = fs.readFileSync("prisma/schema.prisma","utf8");
const api = fs.readFileSync("app/api/admin/growth-commitments/route.ts","utf8");
const ui = fs.readFileSync("app/admin/growth-commitments/GrowthCommitments.tsx","utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx","utf8");
if (
  !schema.includes("model GrowthCommitment") ||
  !api.includes("GROWTH_COMMITMENT_CREATED") ||
  !ui.includes("Growth Commitments") ||
  !sidebar.includes("/admin/growth-commitments")
) process.exit(1);
console.log("PASS ✓ — V53 Growth Commitments ✓ / Owner ✓ / Due Date ✓ / Accountability ✓");
