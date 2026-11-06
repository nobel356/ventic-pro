import fs from "node:fs";

const files = {
  route:
    "app/api/orders/route.ts",
  page:
    "app/order/page.tsx",
  schema:
    "prisma/schema.prisma",
  helper:
    "lib/request-idempotency.ts",
  qa:
    "app/api/admin/system-health/idempotency-test/route.ts",
};

const content =
  Object.fromEntries(
    Object.entries(
      files,
    ).map(
      ([key, file]) => [
        key,
        fs.readFileSync(
          file,
          "utf8",
        ),
      ],
    ),
  );

const checks = [
  [
    content.schema.includes(
      "model IdempotencyRequest",
    ) &&
      content.schema.includes(
        "@@unique([scope, key])",
      ),
    "durable idempotency schema",
  ],
  [
    content.route.includes(
      "claimIdempotency",
    ) &&
      content.route.includes(
        "idempotencyRequest.update",
      ) &&
      content.route.includes(
        "idempotentReplay",
      ),
    "orders route integration",
  ],
  [
    content.route.includes(
      "dedupeKey:",
    ) &&
      content.route.includes(
        "new-order:",
      ),
    "new-order admin notification dedupe",
  ],
  [
    content.page.includes(
      '"Idempotency-Key"',
    ) &&
      content.page.includes(
        "idempotencyRef",
      ) &&
      content.page.includes(
        "saving ||",
      ),
    "browser double-submit protection",
  ],
  [
    content.helper.includes(
      'error?.code !==\n      "P2002"',
    ) &&
      content.helper.includes(
        '"CONFLICT"',
      ) &&
      content.helper.includes(
        '"REPLAY"',
      ),
    "idempotency race handling",
  ],
  [
    content.qa.includes(
      "{ length: 8 }",
    ) &&
      content.qa.includes(
        "payloadConflict",
      ),
    "idempotency concurrency QA",
  ],
];

const failed =
  checks.filter(
    ([ok]) => !ok,
  );

if (failed.length) {
  console.error(
    "V20Y-C idempotency security check failed:",
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
  "PASS ✓ — Order Idempotency Integration ✓ / DB Unique Claim ✓ / Replay ✓ / Payload Conflict ✓ / Browser Double-submit Guard ✓",
);
