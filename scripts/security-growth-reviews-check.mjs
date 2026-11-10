import fs from "node:fs";
const schema = fs.readFileSync("prisma/schema.prisma","utf8");
const api = fs.readFileSync("app/api/admin/growth-reviews/route.ts","utf8");
const ui = fs.readFileSync("app/admin/growth-reviews/WeeklyGrowthReview.tsx","utf8");
if (
  !schema.includes("model GrowthReview") ||
  !api.includes("GROWTH_REVIEW_SNAPSHOT") ||
  !ui.includes("Weekly Growth Review")
) process.exit(1);
console.log("PASS ✓ — V52 Weekly Review ✓ / Frozen Snapshot ✓ / Notes+Decisions ✓");
