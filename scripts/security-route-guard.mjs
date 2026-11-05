import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const adminRoot = path.join(
  root,
  "app",
  "api",
  "admin",
);

const failures = [];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries =
    fs.readdirSync(dir, {
      withFileTypes: true,
    });

  return entries.flatMap(
    (entry) => {
      const full = path.join(
        dir,
        entry.name,
      );

      if (entry.isDirectory()) {
        return walk(full);
      }

      return entry.isFile() &&
        entry.name === "route.ts"
        ? [full]
        : [];
    },
  );
}

const authMarkers = [
  "requirePermission(",
  "requireSuperAdmin(",
  "currentUser(",
  "requireArchiveActor(",
  "requireVaultUnlocked(",
  "archiveActorFor(",
];

const authModules = [
  "@/lib/auth-v7",
  "@/lib/archive-vault",
];

const routes = walk(adminRoot);

for (const file of routes) {
  const content =
    fs.readFileSync(
      file,
      "utf8",
    );
  const relative =
    path
      .relative(root, file)
      .replaceAll(
        path.sep,
        "/",
      );

  const importsAuthModule =
    authModules.some((marker) =>
      content.includes(marker),
    );
  const callsAuthGuard =
    authMarkers.some((marker) =>
      content.includes(marker),
    );

  if (
    !importsAuthModule ||
    !callsAuthGuard
  ) {
    failures.push(
      `${relative}: Admin API route has no recognized authentication/authorization guard.`,
    );
  }
}

const legacyPublicRoutes = [
  "app/api/maintenance/route.ts",
  "app/api/complaints/route.ts",
];

for (const relative of legacyPublicRoutes) {
  if (
    fs.existsSync(
      path.join(root, relative),
    )
  ) {
    failures.push(
      `${relative}: legacy unauthenticated endpoint must remain removed.`,
    );
  }
}

const ordersRoute =
  path.join(
    adminRoot,
    "orders",
    "route.ts",
  );

if (!fs.existsSync(ordersRoute)) {
  failures.push(
    "app/api/admin/orders/route.ts is missing.",
  );
} else {
  const content =
    fs.readFileSync(
      ordersRoute,
      "utf8",
    );

  if (
    !content.includes(
      "PERMISSIONS.ORDERS_VIEW",
    )
  ) {
    failures.push(
      "app/api/admin/orders/route.ts must enforce ORDERS_VIEW.",
    );
  }

  if (
    /customer\s*:\s*true/.test(
      content,
    )
  ) {
    failures.push(
      "app/api/admin/orders/route.ts must not serialize the full Customer record.",
    );
  }
}

const pricingRoute =
  path.join(
    adminRoot,
    "pricing",
    "route.ts",
  );

if (!fs.existsSync(pricingRoute)) {
  failures.push(
    "app/api/admin/pricing/route.ts is missing.",
  );
} else {
  const content =
    fs.readFileSync(
      pricingRoute,
      "utf8",
    );

  if (
    !content.includes(
      "PERMISSIONS.PRICE_EDIT",
    )
  ) {
    failures.push(
      "app/api/admin/pricing/route.ts must enforce PRICE_EDIT.",
    );
  }
}

if (failures.length) {
  console.error(
    "\nV20H security route guard FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  `V20H security route guard passed: ${routes.length} admin API routes checked.`,
);
