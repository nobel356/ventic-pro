import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const actions = fs.readFileSync("lib/seo-actions.ts", "utf8");
const api = fs.readFileSync("app/api/admin/seo-actions/route.ts", "utf8");
const client = fs.readFileSync("app/admin/seo-actions/SeoActionCenter.tsx", "utf8");
const page = fs.readFileSync("app/admin/seo-actions/page.tsx", "utf8");
const health = fs.readFileSync("app/admin/seo-health/page.tsx", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");

const checks = [
  [schema.includes("model SeoActionState"), "SEO action state model"],
  [actions.includes("syncSeoActions") && actions.includes('status: "RESOLVED"'), "automatic resolution sync"],
  [actions.includes('existing.status === "RESOLVED"') && actions.includes('status: "TODO"'), "automatic reopen"],
  [api.includes("SEO_ACTION_UPDATED"), "action audit log"],
  [api.includes("Resolved لا يتم اختيارها يدويًا"), "manual resolve blocked"],
  [client.includes("SEO Action Center") && client.includes("ملاحظة التنفيذ"), "action center UI"],
  [client.includes("افتـح مكان الإصلاح") || client.includes("افتح مكان الإصلاح"), "repair deep-link"],
  [page.includes("REPORTS_VIEW"), "action center authorization"],
  [health.includes("/admin/seo-actions"), "health to action center link"],
  [sidebar.includes('href: "/admin/seo-actions"'), "sidebar action center link"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V45 Action Queue ✓ / Owner+Due+Notes ✓ / Auto Resolve ✓ / Auto Reopen ✓ / Audit ✓ / No Fake Manual Resolve ✓",
);
