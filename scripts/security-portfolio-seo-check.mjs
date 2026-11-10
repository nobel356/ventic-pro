import fs from "node:fs";
const works = fs.readFileSync("app/works/page.tsx","utf8");
const blog = fs.readFileSync("app/blog/page.tsx","utf8");

const checks = [
  [works.includes('"VideoObject"') && works.includes('"ItemList"'), "portfolio structured data"],
  [works.includes('"customerConsent" = true'), "consented work only"],
  [works.includes("absolute:"), "absolute works title"],
  [blog.includes('title: "دليل التهوية"'), "blog title duplication fixed"],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const[,l]of failed)console.error("FAIL:",l);process.exit(1);}
console.log("PASS ✓ — V67 Portfolio SEO ✓ / VideoObject ✓ / Consent ✓ / Blog Title Fix ✓");
