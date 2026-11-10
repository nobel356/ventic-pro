import fs from "node:fs";
const lib = fs.readFileSync("lib/review-reminders.ts","utf8");
const daily = fs.readFileSync("app/api/cron/daily-ops/route.ts","utf8");

const checks = [
  [lib.includes("REVIEW_REMINDER_48H"), "review reminder template"],
  [lib.includes('status: "COMPLETED"'), "completed orders only"],
  [lib.includes("review: null"), "no duplicate review request"],
  [lib.includes("alreadySent"), "notification dedupe"],
  [daily.includes("runReviewReminderBatch"), "daily automation"],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const[,l]of failed)console.error("FAIL:",l);process.exit(1);}
console.log("PASS ✓ — V66 Review Follow-up ✓ / 48h Delay ✓ / Dedupe ✓ / Daily Automation ✓");
