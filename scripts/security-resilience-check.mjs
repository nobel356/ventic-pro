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

const leadApi =
  read("app/api/leads/route.ts");

const directNotificationCalls =
  leadApi.match(
    /await\s+notifyLeadStarted\s*\(/g,
  ) || [];

if (directNotificationCalls.length) {
  failures.push(
    "lead API still has direct await notifyLeadStarted calls outside the non-blocking wrapper.",
  );
}

const checks = [
  [
    "runtime resolver",
    read("lib/runtime-control.ts"),
    [
      "resolveRuntimeControl",
      "DEGRADED_RUNTIME_CONTROL",
      '"LEAD_ONLY"',
      "leadCapture: true",
      "notifications: false",
      "marketingTracking: false",
    ],
  ],
  [
    "non blocking effect",
    read("lib/lead-resilience.ts"),
    [
      "runNonBlockingEffect",
      "return {",
      "ok: false",
    ],
  ],
  [
    "lead API isolation",
    leadApi,
    [
      "safeNotifyLeadStarted",
      "runNonBlockingEffect",
      "LEAD_NOTIFICATION_FAILED",
    ],
  ],
  [
    "offline queue",
    read("lib/runtime-lead-queue.ts"),
    [
      "ventic_runtime_pending_leads_v1",
      "enqueueRuntimePendingLead",
      "readRuntimePendingLeads",
      "writeRuntimePendingLeads",
      "slice(-20)",
    ],
  ],
  [
    "runtime gate queue",
    read("app/shared/RuntimeSiteGate.tsx"),
    [
      "enqueueRuntimePendingLead",
      "readRuntimePendingLeads",
      "writeRuntimePendingLeads",
    ],
  ],
  [
    "resilience endpoint",
    read("app/api/admin/resilience-health/route.ts"),
    [
      "requireSuperAdmin",
      "V20V_SIMULATED_RUNTIME_DB_READ_FAILURE",
      "V20V_SIMULATED_NOTIFICATION_FAILURE",
      "leadSurvivedNotificationFailure",
      "RESILIENCE_FAILURE_LAB",
      "tx.lead.delete",
    ],
  ],
  [
    "control center failure lab",
    read(
      "app/admin/control-center/ControlCenterClient.tsx",
    ),
    [
      "Resilience Failure Lab",
      '"/api/admin/resilience-health"',
      "LOCAL_QUEUE_ROUNDTRIP_FAILED",
      "Runtime DB Fail-safe",
      "Offline Queue",
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
    "\nV20V resilience check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20V resilience failure-lab check passed.",
);
