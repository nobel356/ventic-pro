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

const middleware =
  read("middleware.ts");
const layout =
  read("app/layout.tsx");
const gate =
  read(
    "app/shared/RuntimeSiteGate.tsx",
  );

const checks = [
  [
    "middleware pathname handoff",
    middleware,
    [
      "x-ventic-pathname",
      "requestHeaders",
      "headers: requestHeaders",
    ],
  ],
  [
    "server layout hard lock",
    layout,
    [
      'from "next/headers"',
      "getRuntimeControl",
      "bypassRuntimeLock",
      "hardLocked",
      "x-ventic-runtime-lock",
      "initialRuntime=",
    ],
  ],
  [
    "client recovery gate",
    gate,
    [
      "initialRuntime",
      "hardLocked",
      'data?.mode === "NORMAL"',
      "window.location.reload()",
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
    "\nV20S server hard-lock check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20S server hard-lock check passed.",
);
