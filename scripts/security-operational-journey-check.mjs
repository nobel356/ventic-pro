import fs from "node:fs";

const failures = [];

function read(path) {
  if (!fs.existsSync(path)) {
    failures.push(
      path + " is missing.",
    );
    return "";
  }

  return fs.readFileSync(
    path,
    "utf8",
  );
}

const lifecycle =
  read("lib/order-lifecycle.ts");
const execution =
  read("lib/order-execution.ts");
const adminOrder =
  read(
    "app/api/admin/orders/[id]/route.ts",
  );
const assign =
  read(
    "app/api/admin/orders/[id]/assign/route.ts",
  );
const adminExecution =
  read(
    "app/api/admin/orders/[id]/execution/route.ts",
  );
const invoice =
  read(
    "app/api/invoices/[orderId]/route.ts",
  );
const techStatus =
  read(
    "app/api/technician/orders/[id]/status/route.ts",
  );
const health =
  read(
    "app/api/admin/operational-journey-health/route.ts",
  );
const control =
  read(
    "app/admin/control-center/ControlCenterClient.tsx",
  );

const checks = [
  [
    "lifecycle",
    lifecycle,
    [
      "canAdminStatusTransition",
      "canAssignTechnician",
      "canEditAppointment",
      "technicianNextStatus",
      "canExecutionMutate",
      "BEFORE_PHOTO_STAGE_INVALID",
      "AFTER_PHOTO_STAGE_INVALID",
    ],
  ],
  [
    "admin order",
    adminOrder,
    [
      "canAdminStatusTransition",
      "canEditAppointment",
      "archivedAt: null",
      "لا يمكن تخطي تسلسل التنفيذ",
    ],
  ],
  [
    "assign route",
    assign,
    [
      "canAssignTechnician",
      "archivedAt: null",
      "لا يمكن تعيين أو تغيير الفني بعد بدء رحلة التنفيذ",
    ],
  ],
  [
    "admin execution",
    adminExecution,
    [
      "archivedAt: null",
    ],
  ],
  [
    "invoice sync",
    invoice,
    [
      "archivedAt: null",
    ],
  ],
  [
    "tech status",
    techStatus,
    [
      "technicianNextStatus",
    ],
  ],
  [
    "execution core",
    execution,
    [
      "assertAssignedTechnician",
      "assertExecutionMutation",
      "bypassRateLimits",
      "suppressNotifications",
      "TECHNICIAN_MISMATCH",
      "BEFORE_PHOTO_STAGE_INVALID",
      "AFTER_PHOTO_STAGE_INVALID",
    ],
  ],
  [
    "operational E2E",
    health,
    [
      "requireSuperAdmin",
      "completeExecution",
      "confirmNoExecutionMaterials",
      "hashOtp",
      "diagnostic:",
      "bypassRateLimits:",
      "suppressNotifications:",
      "invoiceGenerated",
      "warrantyGenerated",
      "deviceGenerated",
      "aftercareReady",
      "OPERATIONAL_JOURNEY_HEALTHCHECK",
    ],
  ],
  [
    "control center",
    control,
    [
      "Operational Journey E2E",
      '"/api/admin/operational-journey-health"',
      "OTP Completion",
      "Device Creation",
      "Aftercare Ready",
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
        label + " missing " + marker,
      );
    }
  }
}

if (
  health.includes(
    "issueExecutionOtp(",
  )
) {
  failures.push(
    "Operational E2E must not deliver a real OTP.",
  );
}

const diagnosticUses =
  [];
for (const path of [
  "app/api/admin/operational-journey-health/route.ts",
  "app/api/admin/orders/[id]/execution/route.ts",
  "app/api/technician/orders/[id]/complete/route.ts",
]) {
  const source = read(path);
  if (
    source.includes(
      "diagnostic:",
    )
  ) {
    diagnosticUses.push(path);
  }
}

if (
  diagnosticUses.length !== 1 ||
  diagnosticUses[0] !==
    "app/api/admin/operational-journey-health/route.ts"
) {
  failures.push(
    "Diagnostic completion mode must be used only by the SUPER_ADMIN operational health endpoint.",
  );
}

if (failures.length) {
  console.error(
    "\nV20X operational journey check FAILED:\n",
  );
  for (const failure of failures) {
    console.error(
      "- " + failure,
    );
  }
  process.exit(1);
}

console.log(
  "V20X operational journey E2E check passed.",
);
