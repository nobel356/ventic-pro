import fs from "node:fs";
const sidebar=fs.readFileSync("app/admin/AdminSidebar.tsx","utf8");
const css=fs.readFileSync("app/globals.css","utf8");
const checks=[
 [sidebar.includes("const ADMIN_NAV_GROUPS"),"main groups"],
 [sidebar.includes("const ADMIN_NAV_STRUCTURE"),"hierarchy map"],
 [sidebar.includes('label: "المبيعات والعملاء"'),"sales group"],
 [sidebar.includes('label: "التسويق والنمو"'),"growth group"],
 [sidebar.includes('sub: "Growth OS"'),"third-level growth"],
 [sidebar.includes('sub: "SEO"')&&sidebar.includes('sub: "CRO"'),"content subtopics"],
 [sidebar.includes("const visibleItems = navItems.filter"),"permissions filter preserved"],
 [sidebar.includes("ADMIN_NAV_GROUPS.map"),"hierarchical render"],
 [sidebar.includes('open={active || group.key === "overview"}'),"active auto open"],
 [css.includes("V54 hierarchical admin sidebar")&&css.includes("vpAdminNavSubGroup"),"hierarchy css"],
];
const failed=checks.filter(([ok])=>!ok);
if(failed.length){for(const[,label] of failed)console.error("FAIL:",label);process.exit(1)}
console.log("PASS ✓ — V54 Main Topics ✓ / Subtopics ✓ / 3-Level Groups ✓ / Permissions Preserved ✓ / Active Auto-Open ✓");
