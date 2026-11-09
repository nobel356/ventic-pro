import fs from "node:fs";

const categories = fs.readFileSync("lib/blog/categories.ts", "utf8");
const categoryPage = fs.readFileSync(
  "app/blog/category/[category]/page.tsx",
  "utf8",
);
const blogIndex = fs.readFileSync("app/blog/page.tsx", "utf8");
const articlePage = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");

const categoryCount = (categories.match(/slug: "/g) || []).length;

const checks = [
  [categoryCount === 4, "4 topic hubs"],
  [
    categoryPage.includes('"@type": "CollectionPage"'),
    "CollectionPage schema",
  ],
  [
    categoryPage.includes('"@type": "BreadcrumbList"'),
    "Breadcrumb schema",
  ],
  [
    categoryPage.includes("generateStaticParams"),
    "static params",
  ],
  [
    blogIndex.includes("/blog/category/") &&
      blogIndex.includes("category.slug") &&
      blogIndex.includes("category.name"),
    "blog category links",
  ],
  [
    articlePage.includes("articleCategory.slug") &&
      articlePage.includes("/blog/category/") &&
      articlePage.includes("categoryForArticle"),
    "article category link",
  ],
  [
    sitemap.includes("...blogCategories.map") &&
      sitemap.includes("/blog/category/"),
    "topic hubs sitemap",
  ],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) {
    console.error("FAIL:", label);
  }
  process.exit(1);
}

console.log(
  "PASS ✓ — V38.2 4 Topic Hubs ✓ / Schemas ✓ / Blog Links ✓ / Article Links ✓ / Sitemap ✓",
);
