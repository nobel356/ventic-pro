import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const api = fs.readFileSync("app/api/admin/blog/route.ts", "utf8");
const cms = fs.readFileSync("lib/blog/cms.ts", "utf8");
const manager = fs.readFileSync("app/admin/blog/BlogManager.tsx", "utf8");
const workflow = fs.readFileSync("app/admin/blog/BlogWorkflowPanel.tsx", "utf8");
const storage = fs.readFileSync("lib/storage.ts", "utf8");
const imageAdmin = fs.readFileSync("app/api/admin/blog/image/route.ts", "utf8");
const imagePublic = fs.readFileSync("app/api/blog/image/[id]/route.ts", "utf8");
const revisions = fs.readFileSync("app/api/admin/blog/revisions/route.ts", "utf8");

const checks = [
  [schema.includes("scheduledAt") && schema.includes("visualStoragePath"), "BlogArticle workflow fields"],
  [schema.includes("model BlogArticleRevision"), "revision model"],
  [api.includes('"SCHEDULED"') && api.includes("blogArticleRevision.create"), "scheduled publishing + revision snapshot"],
  [cms.includes('status: "SCHEDULED"') && cms.includes("scheduledAt: { lte: now }"), "scheduled public visibility"],
  [storage.includes("uploadBlogImage"), "private blog image upload"],
  [imageAdmin.includes("BLOG_IMAGE_UPDATED"), "admin image endpoint"],
  [imagePublic.includes("getStoredFile") && imagePublic.includes("public, max-age=3600"), "public image proxy"],
  [revisions.includes("BLOG_REVISION_RESTORED"), "revision restore endpoint"],
  [manager.includes("BlogWorkflowPanel") && manager.includes('"workflow"'), "admin workflow tab"],
  [workflow.includes("جدولة") && workflow.includes("سجل النسخ") && workflow.includes("معاينة المقال"), "workflow UI"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V40 Scheduling ✓ / Draft Preview ✓ / Private Image Upload ✓ / Public Image Proxy ✓ / Revisions ✓ / Restore ✓",
);
