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
    "runtime helper",
    read("lib/runtime-control.ts"),
    [
      "DEGRADED_RUNTIME_CONTROL",
      'mode: "LEAD_ONLY"',
      "leadCapture: true",
      "sanitizeRuntimeControl",
    ],
  ],
  [
    "public runtime endpoint",
    read("app/api/runtime/route.ts"),
    [
      "getRuntimeControl",
      "no-store",
    ],
  ],
  [
    "admin runtime endpoint",
    read("app/api/admin/runtime-controls/route.ts"),
    [
      'user?.role === "SUPER_ADMIN"',
      "saveRuntimeControl",
      "RUNTIME_CONTROL_UPDATED",
    ],
  ],
  [
    "lead capture",
    read("app/api/leads/route.ts"),
    [
      "control.leadCapture",
      "LEAD_CAPTURE_DISABLED",
      "durableRateLimit",
      "LEAD_NOTIFICATION_FAILED",
    ],
  ],
  [
    "public order",
    read("app/api/orders/route.ts"),
    [
      "control.detailedOrders",
      "existingCustomer?.archivedAt",
      "public-order-phone:",
    ],
  ],
  [
    "order entry gate",
    read("app/order/OrderEntryGate.tsx"),
    [
      "ventic_pending_leads_v1",
      "/api/runtime",
      "syncPendingLeads",
      "LEAD_CAPTURE_DISABLED",
      "wa.me",
    ],
  ],
  [
    "estimate",
    read("app/api/public/order-estimate/route.ts"),
    ["control.estimates"],
  ],
  [
    "coupon",
    read("app/api/coupons/validate/route.ts"),
    ["control.coupons"],
  ],
  [
    "uploads",
    read("app/api/orders/[id]/customer-attachments/route.ts"),
    ["control.uploads"],
  ],
  [
    "reviews",
    read("app/api/reviews/route.ts"),
    ["control.reviews"],
  ],
  [
    "aftercare",
    read("app/api/customer/aftercare/route.ts"),
    ["control.aftercare"],
  ],
  [
    "portfolio",
    read("app/api/portfolio-videos/route.ts"),
    ["control.portfolio"],
  ],
  [
    "marketing tracking",
    read("app/api/marketing/events/route.ts"),
    [
      "control.marketingTracking",
      "durableRateLimit",
    ],
  ],
  [
    "customer session gate",
    read("lib/customer-auth.ts"),
    [
      "getRuntimeControl",
      "control.customerAccounts",
    ],
  ],
  [
    "admin notifications",
    read("lib/admin-notifications.ts"),
    [
      "NOTIFICATIONS_RUNTIME_DISABLED",
      "control.notifications",
    ],
  ],
  [
    "customer notifications",
    read("lib/customer-notifications.ts"),
    [
      "NOTIFICATIONS_RUNTIME_DISABLED",
      "control.notifications",
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

const schema =
  read("prisma/schema.prisma");

if (
  !schema.includes(
    "model RuntimeSetting",
  )
) {
  failures.push(
    "RuntimeSetting model missing.",
  );
}

if (failures.length) {
  console.error(
    "\nV20P runtime control check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20P runtime control and resilience check passed.",
);
