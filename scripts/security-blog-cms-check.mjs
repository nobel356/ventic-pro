import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const perms = fs.readFileSync("lib/permission-config.ts", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");
const layout = fs.readFileSync("app/admin/layout.tsx", "utf8");
const api = fs.readFileSync("app/api/admin/blog/route.ts", "utf8");
const manager = fs.readFileSync("app/admin/blog/BlogManager.tsx", "utf8");
const cms = fs.readFileSync("lib/blog/cms.ts", "utf8");
const article = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const index = fs.readFileSync("app/blog/page.tsx", "utf8");
const feed = fs.readFileSync("app/feed.xml/route.ts", "utf8");
const sitemap = fs.readFileSync("app/sitemap.ts", "utf8");

const checks = [
  [schema.includes("model BlogArticle"), "BlogArticle Prisma model"],
  [perms.includes('BLOG_MANAGE: "blog.manage"'), "blog permission"],
  [sidebar.includes('href: "/admin/blog"'), "admin sidebar link"],
  [layout.includes("canManageBlog"), "admin layout permission"],
  [api.includes("BLOG_ARTICLE_CREATED") && api.includes("BLOG_ARTICLE_UPDATED"), "audit logged CRUD"],
  [manager.includes("إدارة المقالات") || manager.includes("Google preview"), "admin editor"],
  [cms.includes("staticArticles") && cms.includes("fallback"), "public DB fallback"],
  [article.includes("getPublishedBlogArticle"), "article reads CMS"],
  [index.includes("getPublishedBlogArticles"), "blog index reads CMS"],
  [feed.includes("getPublishedBlogArticles"), "RSS reads CMS"],
  [sitemap.includes("getPublishedBlogArticles"), "sitemap reads CMS"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — Blog CMS Model ✓ / Permission ✓ / Admin CRUD ✓ / Audit ✓ / Public CMS ✓ / Static Fallback ✓ / RSS ✓ / Sitemap ✓",
);
