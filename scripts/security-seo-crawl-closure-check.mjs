import fs from "node:fs";

const read = (p) => fs.readFileSync(p, "utf8");

const orderLayout = read("app/order/layout.tsx");
const callback = read("app/callback/page.tsx");
const works = read("app/works/page.tsx");
const calculator = read("app/calculator/page.tsx");
const offers = read("app/offers/page.tsx");
const areas = read("app/areas/page.tsx");
const home = read("app/page.tsx");
const chrome = read("app/shared/SiteChrome.tsx");
const sitemap = read("app/sitemap.ts");

const legal = [
  "app/legal/privacy/page.tsx",
  "app/legal/refund/page.tsx",
  "app/legal/terms/page.tsx",
  "app/legal/warranty/page.tsx",
].map(read);

const checks = [
  [orderLayout.includes("index: false") && orderLayout.includes('canonical: "/order"'), "order noindex + canonical"],
  [callback.includes("generateMetadata") && callback.includes("index: false") && callback.includes('canonical: "/callback"'), "callback query-safe metadata"],
  [legal.every((s) => s.includes("export const metadata: Metadata") && s.includes("canonical:")), "unique legal metadata"],
  [works.includes("تنفيذات تهوية حقيقية من Ventic Pro") && works.includes("<h1"), "works H1 + useful copy"],
  [calculator.includes("الحاسبة بتديك تقدير مبدئي، مش مقايسة نهائية"), "calculator useful copy"],
  [offers.includes("إزاي عروض Ventic Pro بتشتغل؟"), "offers useful copy"],
  [areas.includes("إزاي بنحدد إن المنطقة متاحة؟") && areas.includes("مش ظاهرة"), "areas useful reality copy"],
  [home.includes('href="/why-ventic"') && chrome.includes('style={footerLink} href="/why-ventic"'), "why-ventic internal links"],
  [!sitemap.includes('["/order"'), "noindex order removed from sitemap"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log("PASS ✓ — SEO Crawl Closure ✓ / Transactional Noindex ✓ / Unique Metadata ✓ / H1 ✓ / Thin Pages Strengthened ✓ / Orphan Fixed ✓ / Sitemap Aligned ✓");
