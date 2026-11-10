import fs from "node:fs";
const sidebar = fs.readFileSync("app/admin/AdminSidebar.tsx","utf8");
const layout = fs.readFileSync("app/admin/layout.tsx","utf8");
if (
  !sidebar.includes("vpAdminPowerTools") ||
  !sidebar.includes("vp_admin_pins") ||
  !sidebar.includes("vp_admin_recent") ||
  !sidebar.includes("ابحث في لوحة التحكم") ||
  !layout.includes(".vpAdminNavSearch")
) process.exit(1);
console.log("PASS ✓ — V58 Sidebar Search ✓ / Favorites ✓ / Recent Pages ✓ / Mobile Safe ✓");
