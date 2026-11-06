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

const aftercare =
  read(
    "app/api/customer/aftercare/route.ts",
  );
const reviewApi =
  read("app/api/reviews/route.ts");
const approval =
  read(
    "app/api/customer-approval/[token]/route.ts",
  );

const checks = [
  [
    "journey security helper",
    read(
      "lib/customer-journey-security.ts",
    ),
    [
      "customerActiveOrderWhere",
      "technicianActiveOrderWhere",
      "customerDeviceForOrderWhere",
      "archivedAt: null",
      "sourceOrderId",
      "propertyId",
    ],
  ],
  [
    "aftercare boundary",
    aftercare,
    [
      "!control.aftercare",
      "customerActiveOrderWhere",
      "customerDeviceForOrderWhere",
      "archivedAt: null",
      "الجهاز غير تابع لهذا الطلب أو العقار",
    ],
  ],
  [
    "review API boundary",
    reviewApi,
    [
      "customerActiveOrderWhere",
    ],
  ],
  [
    "customer review page",
    read(
      "app/customer/review/[orderId]/page.tsx",
    ),
    [
      "archivedAt: null",
    ],
  ],
  [
    "customer warranty page",
    read(
      "app/customer/account/warranty/[orderId]/page.tsx",
    ),
    [
      "archivedAt: null",
    ],
  ],
  [
    "customer invoice page",
    read(
      "app/customer/account/invoices/[id]/page.tsx",
    ),
    [
      "archivedAt: null",
    ],
  ],
  [
    "QR invoice boundary",
    read(
      "app/api/customer/qr-link/route.ts",
    ),
    [
      "archivedAt: null",
    ],
  ],
  [
    "approval archive boundary",
    approval,
    [
      "archivedOrderResponse",
      "archivedAt: true",
      "هذا الطلب مؤرشف",
    ],
  ],
  [
    "journey health endpoint",
    read(
      "app/api/admin/journey-health/route.ts",
    ),
    [
      "requireSuperAdmin",
      "customerOwnOrder",
      "crossCustomerDenied",
      "archivedCustomerDenied",
      "wrongTechnicianDenied",
      "wrongPropertyDeviceDenied",
      "archivedInvoiceDenied",
      "roleBoundaries",
      "V20W_JOURNEY_ROLLBACK",
      "CUSTOMER_JOURNEY_HEALTHCHECK",
    ],
  ],
  [
    "control center journey panel",
    read(
      "app/admin/control-center/ControlCenterClient.tsx",
    ),
    [
      "Customer Journey Integrity",
      '"/api/admin/journey-health"',
      "Customer Isolation",
      "Device-Order Binding",
      "Rollback Cleanup",
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

const technicianRoutes = [
  "app/api/technician/orders/route.ts",
  "app/api/technician/orders/[id]/attachments/route.ts",
  "app/api/technician/orders/[id]/complete/route.ts",
  "app/api/technician/orders/[id]/execution/route.ts",
  "app/api/technician/orders/[id]/materials/route.ts",
  "app/api/technician/orders/[id]/otp/route.ts",
  "app/api/technician/orders/[id]/status/route.ts",
];

for (const path of technicianRoutes) {
  const source = read(path);

  if (
    !source.includes(
      "archivedAt",
    )
  ) {
    failures.push(
      `${path} must block archived orders.`,
    );
  }
}

const permissions =
  read("lib/permission-config.ts");

if (
  !permissions.includes(
    "TECHNICIAN: []",
  )
) {
  failures.push(
    "TECHNICIAN default admin permissions must remain empty.",
  );
}

if (failures.length) {
  console.error(
    "\nV20W customer journey check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20W customer journey integrity check passed.",
);
