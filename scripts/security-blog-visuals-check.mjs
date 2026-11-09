import fs from "node:fs";

const article = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const visual = fs.readFileSync("app/blog/ArticleVisual.tsx", "utf8");
const gallery = fs.readFileSync("app/shared/PortfolioGallery.tsx", "utf8");

const visualDir = "public/blog/visuals";
const files = fs.existsSync(visualDir)
  ? fs.readdirSync(visualDir).filter((name) => name.endsWith(".svg"))
  : [];

const checks = [
  [files.length === 12, "12 original SVG article visuals"],
  [visual.includes("/blog/visuals/${slug}.svg"), "visual image route"],
  [visual.includes('alt={`رسم توضيحي:'), "descriptive image alt"],
  [article.includes("<ArticleVisual"), "article visual mounted"],
  [article.includes("<PortfolioGallery"), "real works mounted in articles"],
  [article.includes("matchTerms={workTerms}"), "contextual works matching"],
  [gallery.includes("matchTerms?: string[]"), "gallery contextual filtering"],
  [gallery.includes("contextTitle?: string"), "contextual works heading"],
  [gallery.includes("haystack.includes"), "portfolio semantic matching"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — 12 SVG Visuals ✓ / Alt Text ✓ / Article Figures ✓ / Real Works ✓ / Context Matching ✓",
);
