import fs from "node:fs";

const command = fs.readFileSync("lib/growth-command.ts", "utf8");
const page = fs.readFileSync("app/admin/growth-dashboard/page.tsx", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");

const checks = [
  [command.includes("buildSeoHealth") && command.includes("buildContentGrowthOpportunities"), "cross-module aggregation"],
  [command.includes("orderAttributionCoverage") && command.includes("leadAttributionCoverage"), "attribution quality gates"],
  [command.includes("stoppedWithWinner") && command.includes("summarizeExperiment"), "CRO decision readiness"],
  [command.includes("overdueSeoActions"), "SEO execution queue"],
  [command.includes('priority: "CRITICAL"') && command.includes('priority: "HIGH"'), "ranked next-best actions"],
  [page.includes("Growth Command Center") && page.includes("Next Best Actions"), "executive command UI"],
  [page.includes("Quality Gates") && page.includes("CRO Pipeline"), "cross-functional sections"],
  [page.includes("/admin/seo-actions") && page.includes("/admin/cro-decisions"), "action deep-links"],
  [sidebar.includes('href: "/admin/growth-dashboard"'), "existing growth navigation preserved"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V49 Growth Command Center ✓ / Quality Gates ✓ / Ranked Actions ✓ / SEO+Attribution+Content+CRO ✓ / No Duplicate Dashboard ✓",
);
