import fs from "node:fs";

const engine = fs.readFileSync("lib/seo-health.ts", "utf8");
const page = fs.readFileSync("app/admin/seo-health/page.tsx", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
const robots = fs.readFileSync("app/robots.ts", "utf8");
const article = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const area = fs.readFileSync("app/areas/[governorate]/[area]/page.tsx", "utf8");

const checks = [
  [engine.includes("duplicateTitles") && engine.includes("duplicateDescriptions"), "duplicate detection"],
  [engine.includes("contentLength") && engine.includes("ageDays > 180"), "thin/stale content checks"],
  [engine.includes("seoPublished") && engine.includes("seoHighlights"), "local SEO quality checks"],
  [engine.includes("expectedSitemapUrls"), "sitemap coverage calculation"],
  [page.includes("SEO Health Center") && page.includes("SEO Score"), "admin health center"],
  [sidebar.includes('href: "/admin/seo-health"'), "admin navigation"],
  [robots.includes('"/admin/"') && robots.includes("sitemap:"), "robots protection"],
  [sitemap.includes("seoPublished: true") && sitemap.includes("publishedArticles"), "dynamic sitemap"],
  [article.includes('"@type": "BlogPosting"') && article.includes('"@type": "BreadcrumbList"'), "blog schema"],
  [area.includes('"@type": "Service"') && area.includes('"@type": "FAQPage"'), "local schema"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V44 SEO Health ✓ / Duplicate+Thin Content ✓ / Local SEO QA ✓ / Sitemap Coverage ✓ / Schema Infrastructure ✓",
);
