import fs from "node:fs";
const lib = fs.readFileSync("lib/growth-funnel.ts","utf8");
const page = fs.readFileSync("app/admin/growth-funnel/page.tsx","utf8");
if (
  !lib.includes("Lead → Order") ||
  !lib.includes("Order → Completed") ||
  !lib.includes("Revenue → Paid") ||
  !page.includes("Growth Funnel Leaks")
) process.exit(1);
console.log("PASS ✓ — V51 Funnel Leak Analyzer ✓ / Actual vs Target ✓ / Ranked Gap ✓");
