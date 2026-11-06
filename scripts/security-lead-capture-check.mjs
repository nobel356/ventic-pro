import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(
      `${path} is missing.`,
    );
    return "";
  }

  return fs.readFileSync(
    path,
    "utf8",
  );
}

const checks = [
  [
    "lead type normalizer",
    read("lib/lead-capture.ts"),
    [
      '"QUICK_CONTACT"',
      '"QUICK_REQUEST"',
      '"DETAILED_ENTRY"',
      "leadRequestTypeFromPayload",
    ],
  ],
  [
    "public lead API",
    read("app/api/leads/route.ts"),
    [
      "leadRequestTypeFromPayload",
      "control.leadCapture",
      "durableRateLimit",
      "deduplicated",
      "notifyLeadStarted",
    ],
  ],
  [
    "runtime fallback",
    read("app/shared/RuntimeSiteGate.tsx"),
    [
      'requestType:\n          "QUICK_REQUEST"',
      "enqueueRuntimePendingLead",
      "readRuntimePendingLeads",
      "writeRuntimePendingLeads",
      '"/api/leads"',
    ],
  ],
  [
    "runtime pending queue",
    read("lib/runtime-lead-queue.ts"),
    [
      "ventic_runtime_pending_leads_v1",
      "slice(-20)",
    ],
  ],
  [
    "lead health endpoint",
    read("app/api/admin/lead-health/route.ts"),
    [
      "requireSuperAdmin",
      "V20U_HEALTHCHECK",
      "LEAD_ADMIN_VISIBILITY_FAILED",
      "tx.lead.delete",
      "LEAD_CAPTURE_HEALTHCHECK",
      "legacyQuickContactAlias",
    ],
  ],
  [
    "control center lead health",
    read(
      "app/admin/control-center/ControlCenterClient.tsx",
    ),
    [
      '"/api/admin/lead-health"',
      "Lead Capture Health",
      "اختبار Lead Capture",
      "Admin Visibility",
      "Cleanup",
    ],
  ],
];

for (const [
  label,
  source,
  markers,
] of checks) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(
        `${label} missing ${marker}`,
      );
    }
  }
}

if (failures.length) {
  console.error(
    "\nV20U lead capture check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20U lead capture proof check passed.",
);
