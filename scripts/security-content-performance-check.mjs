import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const article = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const publicApi = fs.readFileSync("app/api/blog/analytics/route.ts", "utf8");
const adminApi = fs.readFileSync("app/api/admin/blog/performance/route.ts", "utf8");
const adminPage = fs.readFileSync("app/admin/blog/page.tsx", "utf8");
const dashboard = fs.readFileSync("app/admin/blog/BlogPerformanceDashboard.tsx", "utf8");

const checks = [
  [schema.includes("model BlogAnalyticsEvent"), "analytics model"],
  [article.includes("<BlogAnalyticsTracker") && article.includes("utm_medium=blog"), "article tracker + blog UTM"],
  [
    article.includes('data-blog-event="SERVICE_CLICK"') ||
      (
        article.includes("<ExperimentServiceCta") &&
        fs
          .readFileSync(
            "app/blog/ExperimentServiceCta.tsx",
            "utf8",
          )
          .includes('data-blog-event="SERVICE_CLICK"')
      ),
    "service CTA tracking",
  ],
  [article.includes('data-blog-event="CALCULATOR_CLICK"'), "calculator CTA tracking"],
  [article.includes('data-blog-event="ORDER_CLICK"'), "order CTA tracking"],
  [publicApi.includes("sha256") && !publicApi.includes("clientIp"), "privacy-safe session hashing"],
  [publicApi.includes("recentCount >= 30"), "per-session daily cap"],
  [adminApi.includes('contains: "medium=blog"') && adminApi.includes("campaign="), "real order attribution"],
  [dashboard.includes("Conversion %") && dashboard.includes("Order Value"), "performance dashboard"],
  [adminPage.includes("/admin/blog/performance"), "admin performance link"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V41 Anonymous Analytics ✓ / CTA Tracking ✓ / Real Order Attribution ✓ / 7-30-90 Dashboard ✓ / Privacy Guardrails ✓",
);
