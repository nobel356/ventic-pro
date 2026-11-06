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
const lockPage =
  read(
    "app/runtime-lock/page.tsx",
  );

const checks = [
  [
    "routing hard lock middleware",
    middleware,
    [
      "runtimeSnapshot",
      "shouldProbeRuntime",
      'lockUrl.pathname =',
      '"/runtime-lock"',
      "NextResponse.rewrite",
      "x-ventic-runtime-lock",
      "x-ventic-runtime-control",
      "X-Robots-Tag",
    ],
  ],
  [
    "runtime snapshot layout",
    layout,
    [
      "runtimeFromHeader",
      "sanitizeRuntimeControl",
      "x-ventic-runtime-control",
      "x-ventic-runtime-lock",
    ],
  ],
  [
    "internal lock route",
    lockPage,
    [
      "x-ventic-runtime-lock",
      "redirect",
      "return null",
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
    "\nV20T routing hard-lock check FAILED:\n",
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`,
    );
  }

  process.exit(1);
}

console.log(
  "V20T routing hard-lock check passed.",
);
