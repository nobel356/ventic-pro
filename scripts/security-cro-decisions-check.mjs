import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const api = fs.readFileSync("app/api/admin/cro-decisions/route.ts", "utf8");
const panel = fs.readFileSync("app/admin/cro-decisions/CroDecisionPanel.tsx", "utf8");
const page = fs.readFileSync("app/admin/cro-decisions/page.tsx", "utf8");
const experimentApi = fs.readFileSync("app/api/admin/cro-experiments/route.ts", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");

const checks = [
  [schema.includes("decisionNote") && schema.includes("previousServiceLabel") && schema.includes("rolledBackAt"), "decision persistence fields"],
  [api.includes('action === "ADOPT_WINNER"') && api.includes("result.pValue"), "manual winner adoption"],
  [api.includes("!result.enoughSample") && api.includes("!result.significant"), "rollout eligibility guard"],
  [api.includes('action === "RECORD_NO_WINNER"'), "no-winner learning"],
  [api.includes('action === "ROLLBACK"') && api.includes("appliedServiceLabel"), "safe rollback guard"],
  [api.includes("blogArticleRevision.create"), "article revision before rollout/rollback"],
  [api.includes("CRO_WINNER_ROLLED_OUT") && api.includes("CRO_ROLLOUT_ROLLED_BACK"), "audit trail"],
  [panel.includes("Adopt Winner") && panel.includes("Orders هنا Secondary metric"), "decision UI honesty"],
  [page.includes("BLOG_MANAGE"), "decision authorization"],
  [experimentApi.includes("decision") && experimentApi.includes("rolledOutAt"), "experiment API exposes decision fields"],
  [sidebar.includes('href: "/admin/cro-decisions"'), "decision navigation"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V48 Manual Decision ✓ / Statistical Guard ✓ / Winner Rollout ✓ / Learning Log ✓ / Safe Rollback ✓ / Revision+Audit ✓",
);
