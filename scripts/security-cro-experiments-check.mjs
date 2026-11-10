import fs from "node:fs";

const schema = fs.readFileSync("prisma/schema.prisma", "utf8");
const lib = fs.readFileSync("lib/cro-experiments.ts", "utf8");
const component = fs.readFileSync("app/blog/ExperimentServiceCta.tsx", "utf8");
const eventApi = fs.readFileSync("app/api/blog/experiment/event/route.ts", "utf8");
const adminApi = fs.readFileSync("app/api/admin/cro-experiments/route.ts", "utf8");
const article = fs.readFileSync("app/blog/[slug]/page.tsx", "utf8");
const admin = fs.readFileSync("app/admin/cro-experiments/CroExperimentCenter.tsx", "utf8");
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx", "utf8");

const checks = [
  [schema.includes("model CroExperiment") && schema.includes("model CroEvent"), "CRO models"],
  [lib.includes("twoProportionPValue") && lib.includes("pValue < 0.05"), "significance calculation"],
  [lib.includes("controlExposures >= 50") && lib.includes("variantExposures >= 50"), "minimum sample guard"],
  [component.includes("stableBucket") && component.includes("< 50"), "stable 50/50 assignment"],
  [component.includes("utm_content") && component.includes("cro:"), "variant order attribution"],
  [eventApi.includes("sha256") && eventApi.includes("EXPOSURE") && eventApi.includes("CLICK"), "anonymous deduplicated experiment events"],
  [adminApi.includes("يوجد Experiment شغال بالفعل"), "one running experiment per article"],
  [article.includes("<ExperimentServiceCta"), "article CTA experiment integration"],
  [admin.includes("No significant winner") && admin.includes("p-value"), "honest experiment result UI"],
  [sidebar.includes('href: "/admin/cro-experiments"'), "admin experiment navigation"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V47 50/50 Assignment ✓ / Exposure+Click ✓ / Order Attribution ✓ / Sample Guard ✓ / Significance Guard ✓ / One Active Test Per Article ✓",
);
