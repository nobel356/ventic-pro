import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const api = fs.readFileSync("app/api/admin/areas/route.ts", "utf8");
const ui = fs.readFileSync("app/admin/areas/AreasManagement.tsx", "utf8");
const page = fs.readFileSync("app/areas/[governorate]/[area]/page.tsx", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");

const checks = [
  [schema.includes("seoPublished") && schema.includes("seoHighlights") && schema.includes("seoFaq"), "ServiceArea SEO fields"],
  [api.includes("seoReady") && api.includes("لا يمكن نشر SEO"), "server readiness gate"],
  [ui.includes("Local SEO") && ui.includes("جاهزة للنشر"), "admin SEO editor"],
  [page.includes("index: false") && page.includes("seoPublished"), "noindex guard"],
  [page.includes('"@type": "BreadcrumbList"'), "area breadcrumbs"],
  [page.includes('"@type": "FAQPage"'), "area FAQ schema"],
  [page.includes("getPublishedBlogArticles"), "area internal blog links"],
  [sitemap.includes("seoPublished: true"), "sitemap SEO publish gate"],
  [sitemap.includes("lastModified: item.updatedAt"), "area sitemap lastModified"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V42 Local SEO Fields ✓ / Readiness Gate ✓ / Noindex Guard ✓ / FAQ+Breadcrumb Schema ✓ / Sitemap Gate ✓ / Internal Links ✓",
);
