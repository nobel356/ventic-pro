import fs from "node:fs";
import path from "node:path";

const failures = [];

function read(file) {
  if (!fs.existsSync(file)) {
    failures.push(
      `${file} is missing.`,
    );
    return "";
  }

  return fs.readFileSync(
    file,
    "utf8",
  );
}

const helper =
  read("lib/technician.ts");

for (const forbidden of [
  "ventic_tech",
  "DEMO_TECHNICIAN_ID",
  "cookies()",
  "TECH_COOKIE",
]) {
  if (
    helper.includes(
      forbidden,
    )
  ) {
    failures.push(
      `Technician auth helper still contains legacy fallback: ${forbidden}`,
    );
  }
}

if (
  !helper.includes(
    "currentUser",
  ) ||
  !helper.includes(
    '"TECHNICIAN"',
  )
) {
  failures.push(
    "Technician auth must rely on the authenticated staff session.",
  );
}

const routeRoot =
  "app/api/technician";

function walk(dir) {
  const entries =
    fs.readdirSync(
      dir,
      {
        withFileTypes:
          true,
      },
    );

  for (const entry of entries) {
    const full =
      path.join(
        dir,
        entry.name,
      );

    if (
      entry.isDirectory()
    ) {
      walk(full);
      continue;
    }

    if (
      entry.name !==
      "route.ts"
    ) {
      continue;
    }

    const source =
      read(full);

    if (
      !source.includes(
        "currentTechnician",
      )
    ) {
      failures.push(
        `${full} does not enforce technician session auth.`,
      );
    }
  }
}

walk(routeRoot);

if (failures.length) {
  console.error(
    "\nV20L technician auth check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20L technician auth lockdown check passed.",
);
