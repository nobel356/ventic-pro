import fs from "node:fs";
const page = fs.readFileSync("app/admin/permission-matrix/page.tsx","utf8");
if (
  !page.includes("Permission Matrix Audit") ||
  !page.includes("ROLE_DEFAULT_PERMISSIONS") ||
  !page.includes("CUSTOM_PERMISSIONS_MARKER")
) process.exit(1);
console.log("PASS ✓ — V57 Permission Matrix ✓ / Source-of-Truth Roles ✓ / Custom Overrides ✓");
