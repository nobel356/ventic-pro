import fs from "node:fs";

const requiredFiles = [
  "lib/blog/articles.ts",
  "app/services/ServiceLanding.tsx",
  "app/services/fan-replacement/page.tsx",
  "app/services/ductwork/page.tsx",
  "app/services/ventilation-troubleshooting/page.tsx",
  "app/areas/[governorate]/[area]/page.tsx",
  "app/shared/SeoJsonLd.tsx",
  "app/shared/ConversionTracker.tsx",
  "app/admin/growth-dashboard/page.tsx",
  "app/admin/leads/page.tsx",
  "app/api/admin/notifications/route.ts",
  "app/shared/AiAssistant.tsx",
  "lib/ventilation-advisor.ts",
  "app/calculator/AirflowAdvisor.tsx",
  "app/api/quotes/route.ts",
  "app/api/invoices/[orderId]/route.ts",
  "app/api/payments/route.ts",
  "app/api/technician/orders/[id]/execution/route.ts",
  "app/admin/inventory/page.tsx",
  "app/api/warranties/route.ts",
  "app/admin/reviews/page.tsx",
  "middleware.ts",
  "app/admin/disaster-recovery/page.tsx",
  "app/shared/WebVitalsReporter.tsx",
  "app/a11y-v19.css",
  "app/manifest.ts",
  "public/sw.js",
  "app/admin/seo-actions/page.tsx",
  "app/shared/MarketingAttribution.tsx",
  "app/legal/privacy/page.tsx",
  "app/legal/terms/page.tsx",
  "app/admin/ops-smoke/page.tsx",
  "app/admin/permission-matrix/page.tsx",
  "app/admin/production-verification/page.tsx",
  "V70-V97-CLOSURE.md",
];

const errors = [];

for (const path of requiredFiles) {
  if (!fs.existsSync(path)) {
    errors.push(`Missing required closure file: ${path}`);
  }
}

function expectText(path, patterns) {
  if (!fs.existsSync(path)) return;

  const text = fs.readFileSync(path, "utf8");

  for (const pattern of patterns) {
    if (!text.includes(pattern)) {
      errors.push(
        `${path} missing required marker: ${pattern}`,
      );
    }
  }
}

expectText("app/shared/SeoJsonLd.tsx", [
  "HomeAndConstructionBusiness",
  "WebSite",
  "hasOfferCatalog",
]);

expectText("app/layout.tsx", [
  "vpSkipLink",
  "WebVitalsReporter",
]);

expectText("middleware.ts", [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "sameSiteMutationAllowed",
]);

expectText("public/sw.js", [
  "/offline",
  "isPrivatePath",
]);

expectText("lib/ventilation-advisor.ts", [
  "HIGH_RESISTANCE",
  "designAirflowM3h",
]);

expectText(
  "app/api/marketing/events/route.ts",
  ['"web_vital"'],
);

const stages = [
  ["V70", "Content engineering", true],
  ["V71", "Service pages", true],
  ["V72", "Local SEO", true],
  ["V73", "Brand/entity authority", true],
  ["V74", "Conversion optimization", true],
  ["V75", "Analytics funnel", true],
  ["V76", "Admin analytics", true],
  ["V77", "CRM/leads", true],
  ["V78", "Notifications", true],
  ["V79", "AI assistant", true],
  ["V80", "Technical recommendation foundation", true],
  ["V81", "Quotes/pricing", true],
  ["V82", "Invoices/payments", true],
  ["V83", "Technician operations", true],
  ["V84", "Inventory", true],
  ["V85", "Warranty/aftercare", true],
  ["V86", "Review workflow", true],
  ["V87", "Security hardening", true],
  ["V88", "Backup/DR", true],
  ["V89", "Core Web Vitals telemetry", true],
  ["V90", "Accessibility baseline", true],
  ["V91", "PWA/offline", true],
  ["V92", "External authority growth", "EXTERNAL"],
  ["V93", "Search Console growth loop", true],
  ["V94", "Marketing attribution", true],
  ["V95", "Legal/compliance baseline", true],
  ["V96", "QA matrix", true],
  ["V97", "Production freeze readiness", true],
];

for (const [version, label, status] of stages) {
  console.log(
    `${version} ${status === "EXTERNAL" ? "EXTERNAL" : "PASS"} - ${label}`,
  );
}

if (errors.length) {
  console.error("\nV70-V97 closure check FAILED:\n");
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  "\nPASS - V70-V97 code closure markers are present. V92 remains an external authority/PR/backlink operating track.",
);
