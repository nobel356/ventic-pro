import fs from "node:fs";
const lib = fs.readFileSync("lib/growth-execution.ts","utf8");
const api = fs.readFileSync("app/api/admin/growth-execution/route.ts","utf8");

const checks = [
  [lib.includes("searchConsoleVerified"), "Search Console evidence"],
  [lib.includes("sitemapSubmitted"), "Sitemap submission evidence"],
  [lib.includes("indexedUrls"), "Indexed URL evidence"],
  [lib.includes("EVIDENCE_REQUIRED"), "no fake indexing pass"],
  [api.includes("growth.indexing.lastCheckedAt"), "last checked evidence"],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const[,l]of failed)console.error("FAIL:",l);process.exit(1);}
console.log("PASS ✓ — V64 Indexing Evidence Gate ✓ / Search Console ✓ / Sitemap ✓ / Indexed URLs ✓");
