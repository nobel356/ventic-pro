import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const BASELINE = "20261007080000_baseline_existing_schema";
const baselineDir = path.join(process.cwd(), "prisma", "migrations", BASELINE);
const baselineSql = path.join(baselineDir, "migration.sql");
const baselineSchema = path.join(process.cwd(), "prisma", "baseline-v12d.prisma");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    shell: process.platform === "win32",
    env: {
      ...process.env,
      // Prisma Migrate uses a PostgreSQL advisory lock by default.
      // A stale lock from the previous pooled Neon migration attempt can
      // survive on the database backend and block both resolve and deploy.
      // This bootstrap is already serialized by the Vercel production build,
      // so disable Prisma's advisory lock for these migration commands only.
      PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK: "1",
    },
  });

  if (options.capture) {
    return {
      status: result.status ?? 1,
      stdout: result.stdout || "",
      stderr: result.stderr || "",
    };
  }

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }

  return { status: 0, stdout: "", stderr: "" };
}

if (!fs.existsSync(baselineSchema)) {
  console.error("Missing prisma/baseline-v12d.prisma");
  process.exit(1);
}

fs.mkdirSync(baselineDir, { recursive: true });

const diff = run(
  process.platform === "win32" ? "npx.cmd" : "npx",
  [
    "prisma",
    "migrate",
    "diff",
    "--from-empty",
    "--to-schema-datamodel",
    "prisma/baseline-v12d.prisma",
    "--script",
  ],
  { capture: true },
);

if (diff.status !== 0 || !diff.stdout.trim()) {
  console.error(diff.stderr || "Could not generate baseline migration.");
  process.exit(diff.status || 1);
}

fs.writeFileSync(baselineSql, diff.stdout, "utf8");

const prisma = new PrismaClient();

try {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT
      COUNT(*) FILTER (
        WHERE table_schema = 'public'
          AND table_name <> '_prisma_migrations'
      )::int AS "appTables",
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = '_prisma_migrations'
      ) AS "hasMigrationTable"
    FROM information_schema.tables
    WHERE table_schema = 'public';
  `);

  const state = rows?.[0] || {};
  const appTables = Number(state.appTables || 0);
  const hasMigrationTable = Boolean(state.hasMigrationTable);

  if (appTables > 0 && !hasMigrationTable) {
    console.log(
      `Existing database detected (${appTables} public tables) with no Prisma migration history.`,
    );
    console.log(`Baselining existing schema as ${BASELINE}...`);

    const resolved = run(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["prisma", "migrate", "resolve", "--applied", BASELINE],
      { capture: true },
    );

    if (resolved.status !== 0) {
      console.error(resolved.stdout);
      console.error(resolved.stderr);
      process.exit(resolved.status);
    }

    console.log("Baseline recorded successfully.");
  } else if (appTables === 0) {
    console.log("Empty database detected. Baseline will be executed normally.");
  } else {
    console.log("Prisma migration history already exists. No baseline resolve needed.");
  }
} finally {
  await prisma.$disconnect();
}

run(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["prisma", "migrate", "deploy"],
);
