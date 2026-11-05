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

function count(source, token) {
  return source.split(token).length - 1;
}

const entityRoutes = [
  "orders",
  "users",
  "customers",
  "inventory",
  "leads",
  "suppliers",
];

for (const entity of entityRoutes) {
  const source = read(
    `app/api/admin/archive/${entity}/[id]/route.ts`,
  );

  for (const marker of [
    "PERMISSIONS.ARCHIVE_MANAGE",
    "PERMISSIONS.ARCHIVE_RESTORE",
  ]) {
    if (!source.includes(marker)) {
      failures.push(
        `${entity} archive route missing ${marker}`,
      );
    }
  }

  if (
    count(
      source,
      "requireVaultUnlocked(",
    ) < 2
  ) {
    failures.push(
      `${entity} archive + restore must both require an unlocked vault.`,
    );
  }
}

const unlock =
  read(
    "app/api/admin/archive/unlock/route.ts",
  );
const forgot =
  read(
    "app/api/admin/archive/forgot-password/route.ts",
  );
const reset =
  read(
    "app/api/admin/archive/reset-password/route.ts",
  );
const purge =
  read(
    "app/api/admin/archive/purge/[type]/[id]/route.ts",
  );

for (const [
  label,
  source,
  markers,
] of [
  [
    "vault unlock",
    unlock,
    [
      "durableRateLimit",
      "clearDurableRateLimit",
      "archive-unlock:",
    ],
  ],
  [
    "vault recovery request",
    forgot,
    [
      "durableRateLimit",
      "archive-reset:",
    ],
  ],
  [
    "vault recovery submit",
    reset,
    [
      "durableRateLimit",
      "archive-reset-submit:",
      "rateLimitHeaders",
    ],
  ],
]) {
  for (const marker of markers) {
    if (!source.includes(marker)) {
      failures.push(
        `${label} missing ${marker}`,
      );
    }
  }
}

if (
  !purge.includes(
    'actor.role !==',
  ) ||
  !purge.includes(
    '"SUPER_ADMIN"',
  ) ||
  !purge.includes(
    "requireVaultUnlocked(",
  )
) {
  failures.push(
    "Permanent purge must remain Super Admin + unlocked-vault only.",
  );
}

if (failures.length) {
  console.error(
    "\nV20N archive vault integrity check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20N archive vault integrity check passed.",
);
