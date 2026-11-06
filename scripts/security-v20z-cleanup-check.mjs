import fs from "node:fs";

const gitignore =
  fs.readFileSync(
    ".gitignore",
    "utf8",
  );
const page =
  fs.readFileSync(
    "app/admin/system-health/page.tsx",
    "utf8",
  );
const panel =
  fs.readFileSync(
    "app/admin/system-health/QaSuitePanel.tsx",
    "utf8",
  );

const checks = [
  [
    gitignore.includes(
      "node_modules/",
    ) &&
      gitignore.includes(
        "*.tsbuildinfo",
      ) &&
      gitignore.includes(
        "V20*.mjs",
      ),
    "local build/QA artifacts ignored",
  ],
  [
    page.includes(
      'import QaSuitePanel from "./QaSuitePanel";',
    ) &&
      page.includes(
        "<QaSuitePanel />",
      ),
    "System Health QA suite mounted",
  ],
  [
    panel.includes(
      "internal-notification-test",
    ) &&
      panel.includes(
        "idempotency-test",
      ) &&
      panel.includes(
        "upload-integrity-test",
      ),
    "three QA endpoints consolidated",
  ],
  [
    page.includes(
      "<EmailTestPanel />",
    ),
    "Email QA retained on same page",
  ],
];

const failed =
  checks.filter(
    ([ok]) => !ok,
  );

if (failed.length) {
  console.error(
    "V20Z cleanup check failed:",
  );

  for (const [
    ,
    label,
  ] of failed) {
    console.error(
      `- ${label}`,
    );
  }

  process.exit(1);
}

console.log(
  "PASS ✓ — QA Suite Consolidated ✓ / Email QA Retained ✓ / Local Artifact Ignore ✓",
);
