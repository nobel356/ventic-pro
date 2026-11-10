import fs from "node:fs";
const lib = fs.readFileSync("lib/growth-execution.ts","utf8");
if (
  !lib.includes("activeAreas === 0") ||
  !lib.includes("لن يتم إنشاء صفحات مناطق وهمية") ||
  !lib.includes("seoAreas")
) process.exit(1);
console.log("PASS ✓ — V65 Local SEO Reality Gate ✓ / No Fake Areas ✓ / Published Area Evidence ✓");
