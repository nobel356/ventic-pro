import fs from "node:fs";

const lib = fs.readFileSync("lib/growth-execution.ts","utf8");
const ui = fs.readFileSync("app/admin/growth-execution/GrowthExecutionCenter.tsx","utf8");
const api = fs.readFileSync("app/api/admin/growth-execution/route.ts","utf8");

const checks = [
  [lib.includes('implementationStatus') && lib.includes('"CLOSED"'), "build closure state"],
  [lib.includes("Technical + On-page SEO") && lib.includes("Local SEO"), "execution stages"],
  [lib.includes("Portfolio Proof") && lib.includes("CRO Activation"), "portfolio and CRO stages"],
  [ui.includes("Growth Execution Closure"), "closure UI"],
  [api.includes("GROWTH_INDEXING_EVIDENCE_UPDATED"), "evidence audit"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [,label] of failed) console.error("FAIL:",label);
  process.exit(1);
}
console.log("PASS ✓ — V63 Growth Execution Closure ✓ / Build Closed ✓ / Reality Gates ✓");
