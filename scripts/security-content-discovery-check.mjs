import fs from "node:fs";

const article = fs.readFileSync(
  "app/blog/[slug]/page.tsx",
  "utf8",
);
const service = fs.readFileSync(
  "app/services/ServiceLanding.tsx",
  "utf8",
);
const sitemap = fs.readFileSync(
  "app/sitemap.ts",
  "utf8",
);
const layout = fs.readFileSync(
  "app/layout.tsx",
  "utf8",
);
const feed = fs.readFileSync(
  "app/feed.xml/route.ts",
  "utf8",
);

const checks = [
  [
    article.includes(
      "/blog/visuals/${article.slug}.svg",
    ),
    "article image schema",
  ],
  [
    service.includes(
      "serviceArticleSlugs",
    ),
    "service article map",
  ],
  [
    service.includes(
      "مقالات تساعدك قبل التنفيذ",
    ),
    "service article section",
  ],
  [
    sitemap.includes(
      'images: [`${base}/blog/visuals/${article.slug}.svg`]',
    ),
    "image sitemap",
  ],
  [
    layout.includes(
      'type="application/rss+xml"',
    ),
    "RSS autodiscovery",
  ],
  [
    feed.includes("<rss version="),
    "RSS feed",
  ],
];

const failed =
  checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) {
    console.error("FAIL:", label);
  }

  process.exit(1);
}

console.log(
  "PASS ✓ — V37.4 Service↔Blog ✓ / Article Image ✓ / Image Sitemap ✓ / RSS ✓",
);
