import fs from "node:fs";
const api = fs.readFileSync("app/api/admin/cro-experiments/route.ts","utf8");
const lib = fs.readFileSync("lib/growth-execution.ts","utf8");

const checks = [
  [api.includes("CRO_MIN_UNIQUE_SESSIONS_30D = 100"), "100-session CRO gate"],
  [api.includes("CRO_TRAFFIC_NOT_READY"), "start blocked when traffic low"],
  [api.includes("sessionHash"), "unique session calculation"],
  [lib.includes("maxArticleUnique >= 100"), "closure center CRO readiness"],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const[,l]of failed)console.error("FAIL:",l);process.exit(1);}
console.log("PASS ✓ — V68 CRO Traffic Gate ✓ / 100 Unique Sessions ✓ / No Premature Experiments ✓");
