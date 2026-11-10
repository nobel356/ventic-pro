import fs from "node:fs";

const pkg = JSON.parse(
  fs.readFileSync("package.json", "utf8"),
);
const config = fs.readFileSync(
  "prisma.config.ts",
  "utf8",
);

const checks = [
  [!Object.prototype.hasOwnProperty.call(pkg, "prisma"), "package.json prisma config removed"],
  [config.includes('from "prisma/config"'), "Prisma config API"],
  [config.includes('schema: "prisma/schema.prisma"'), "schema path"],
  [config.includes('seed: "node prisma/seed.mjs"'), "seed moved to config"],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V59 Prisma Config ✓ / Legacy package.json Config Removed ✓ / Seed Preserved ✓",
);
