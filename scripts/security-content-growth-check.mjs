import fs from "node:fs";

const engine = fs.readFileSync("lib/content-growth.ts", "utf8");
const api = fs.readFileSync("app/api/admin/content-growth/route.ts", "utf8");
const page = fs.readFileSync("app/admin/content-growth/page.tsx", "utf8");
const client = fs.readFileSync("app/admin/content-growth/ContentGrowthDashboard.tsx", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");

const checks = [
  [engine.includes("uniqueSessions >= 10") && engine.includes("ctaRate < 5"), "low CTA opportunity rule"],
  [engine.includes("intentClicks >= 5") && engine.includes("orderCount === 0"), "conversion leakage rule"],
  [/type:\s*"WINNER"/.test(engine), "winner expansion rule"],
  [/type:\s*"CONTENT_GAP"/.test(engine), "content gap rule"],
  [engine.includes("totalUnique >= 20"), "insufficient-data guard"],
  [api.includes("REPORTS_VIEW"), "growth API authorization"],
  [page.includes("REPORTS_VIEW"), "growth page authorization"],
  [client.includes("Content Growth") && client.includes("الإجراء المقترح"), "growth dashboard UI"],
  [sidebar.includes('href: "/admin/content-growth"'), "growth sidebar link"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V46 Growth Opportunities ✓ / CTA Leakage ✓ / Conversion Leakage ✓ / Winners ✓ / Content Gaps ✓ / Data Sufficiency Guard ✓",
);
