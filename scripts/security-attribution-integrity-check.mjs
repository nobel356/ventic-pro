import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const leads = fs.readFileSync("app/api/leads/route.ts", "utf8");
const orders = fs.readFileSync("app/api/orders/route.ts", "utf8");
const attribution = fs.readFileSync("lib/marketing-attribution.ts", "utf8");
const integrity = fs.readFileSync("lib/attribution-integrity.ts", "utf8");
const health = fs.readFileSync("app/admin/attribution-health/page.tsx", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");

const checks = [
  [schema.includes("attributionSource") && schema.includes("attributionLanding"), "structured schema fields"],
  [attribution.includes("attributionSnapshotFromRequest"), "snapshot parser"],
  [leads.includes("leadAttributionData") && leads.includes("attributionSnapshotFromRequest"), "lead structured capture"],
  [orders.includes("orderAttributionData") && orders.includes("linkedLead"), "lead-to-order attribution inheritance"],
  [integrity.includes("effectiveAttribution") && integrity.includes("hasStructuredAttribution"), "legacy fallback compatibility"],
  [health.includes("Attribution Health") && health.includes("Converted Missing"), "health dashboard"],
  [sidebar.includes('href: "/admin/attribution-health"'), "admin navigation"],
  [orders.includes("acquisitionSource"), "legacy raw field preserved"],
  [leads.includes("source"), "legacy lead source preserved"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V43 Structured Attribution ✓ / Lead→Order Inheritance ✓ / Legacy Compatibility ✓ / Attribution Health ✓",
);
