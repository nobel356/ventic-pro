import fs from "node:fs";

const data = fs.readFileSync("lib/blog/articles.ts", "utf8");
const index = fs.readFileSync("app/blog/page.tsx", "utf8");
const article = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");
const chrome = fs.readFileSync("app/shared/SiteChrome.tsx", "utf8");
const home = fs.readFileSync("app/page.tsx", "utf8");

const slugCount = (data.match(/"slug":/g) || []).length;

const checks = [
  [slugCount === 12, "exactly 12 editorial articles"],
  [article.includes('"@type": "BlogPosting"'), "BlogPosting structured data"],
  [article.includes('"@type": "BreadcrumbList"'), "article breadcrumbs"],
  [article.includes("generateStaticParams"), "static article params"],
  [index.includes('"@type": "CollectionPage"'), "blog collection schema"],
  [sitemap.includes("blogArticles"), "blog sitemap source"],
  [chrome.includes('href: "/blog"'), "blog navigation link"],
  [chrome.includes('href="/blog"'), "blog footer link"],
  [home.includes("blogArticles.slice(0, 3)"), "homepage editorial links"],
  [article.includes("ملاحظة تحريرية"), "editorial transparency note"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — 12 Articles ✓ / BlogPosting ✓ / Breadcrumbs ✓ / Sitemap ✓ / Navigation ✓ / Homepage Links ✓ / Editorial Note ✓",
);
