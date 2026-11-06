import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { get } from "@vercel/blob";
import { PrismaClient } from "@prisma/client";

const BACKUP_PATHNAME = String(
  process.env.BACKUP_PATHNAME || "",
).trim();

const RESTORE_DATABASE_URL = String(
  process.env.RESTORE_DATABASE_URL || "",
).trim();

const RESTORE_MODE = String(
  process.env.RESTORE_MODE || "validate",
)
  .trim()
  .toLowerCase();

const RESTORE_CONFIRM = String(
  process.env.RESTORE_CONFIRM || "",
).trim();

const PROD_HOST = String(
  process.env.VENTIC_PRODUCTION_DB_HOST ||
    "ep-small-brook-b5jo9im7.c-7.us-east-2.aws.neon.tech",
).trim();

function fail(message) {
  console.error("RESTORE STOPPED:", message);
  process.exit(1);
}

function sha256(input) {
  return createHash("sha256")
    .update(input)
    .digest("hex");
}

function quoteIdent(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function chunks(rows, size = 200) {
  const out = [];

  for (let i = 0; i < rows.length; i += size) {
    out.push(rows.slice(i, i + size));
  }

  return out;
}

function topoSort(tables, edges) {
  const set = new Set(tables);

  const indegree = new Map(
    tables.map((table) => [table, 0]),
  );

  const children = new Map(
    tables.map((table) => [table, new Set()]),
  );

  for (const edge of edges) {
    const parent = String(edge.parent);
    const child = String(edge.child);

    if (
      parent === child ||
      !set.has(parent) ||
      !set.has(child)
    ) {
      continue;
    }

    if (!children.get(parent).has(child)) {
      children.get(parent).add(child);

      indegree.set(
        child,
        (indegree.get(child) || 0) + 1,
      );
    }
  }

  const queue = tables
    .filter(
      (table) => indegree.get(table) === 0,
    )
    .sort();

  const result = [];

  while (queue.length) {
    const current = queue.shift();
    result.push(current);

    for (const child of children.get(current) || []) {
      const next =
        (indegree.get(child) || 0) - 1;

      indegree.set(child, next);

      if (next === 0) {
        queue.push(child);
        queue.sort();
      }
    }
  }

  if (result.length !== tables.length) {
    const remaining = tables.filter(
      (table) => !result.includes(table),
    );

    throw new Error(
      `Foreign-key cycle detected: ${remaining.join(", ")}`,
    );
  }

  return result;
}

if (!BACKUP_PATHNAME) {
  fail("BACKUP_PATHNAME is required.");
}

if (!["validate", "apply"].includes(RESTORE_MODE)) {
  fail(
    "RESTORE_MODE must be validate or apply.",
  );
}

console.log(
  "Downloading private backup:",
  BACKUP_PATHNAME,
);

const result = await get(BACKUP_PATHNAME, {
  access: "private",
});

if (!result || result.statusCode !== 200) {
  fail("Backup could not be downloaded.");
}

const zipped = Buffer.from(
  await new Response(result.stream).arrayBuffer(),
);

const envelope = JSON.parse(
  gunzipSync(zipped).toString("utf8"),
);

if (
  envelope?.payload?.format !==
  "ventic-pro-db-backup-v1"
) {
  fail("Unsupported backup format.");
}

const actualSha = sha256(
  JSON.stringify(envelope.payload),
);

if (actualSha !== envelope.sha256) {
  fail("Backup checksum failed.");
}

const tableNames = Object.keys(
  envelope.payload.tables || {},
);

console.log("Backup checksum: PASS");
console.log("Created:", envelope.payload.createdAt);
console.log("Tables:", tableNames.length);
console.log("Rows:", envelope.payload.totalRows);

if (RESTORE_MODE === "validate") {
  console.log(
    "VALIDATION PASS — no database was modified.",
  );
  process.exit(0);
}

if (!RESTORE_DATABASE_URL) {
  fail(
    "RESTORE_DATABASE_URL is required for apply mode.",
  );
}

if (
  RESTORE_CONFIRM !==
  "VENTIC_PRO_RESTORE"
) {
  fail(
    "Set RESTORE_CONFIRM=VENTIC_PRO_RESTORE for apply mode.",
  );
}

const targetHost =
  new URL(RESTORE_DATABASE_URL).hostname;

if (
  targetHost === PROD_HOST &&
  process.env.ALLOW_PRODUCTION_RESTORE !== "YES"
) {
  fail(
    "Production restore is blocked. Set ALLOW_PRODUCTION_RESTORE=YES only during an approved disaster recovery.",
  );
}

const db = new PrismaClient({
  datasources: {
    db: {
      url: RESTORE_DATABASE_URL,
    },
  },
});

try {
  const existing = await db.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `);

  const existingSet = new Set(
    existing.map((row) => String(row.tablename)),
  );

  const missing = tableNames.filter(
    (table) => !existingSet.has(table),
  );

  if (missing.length) {
    fail(
      `Target schema is missing tables: ${missing.join(", ")}`,
    );
  }

  const foreignKeys = await db.$queryRawUnsafe(`
    SELECT
      tc.table_name AS child,
      ccu.table_name AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.constraint_schema = tc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND ccu.table_schema = 'public'
  `);

  const order = topoSort(
    tableNames,
    foreignKeys,
  );

  console.log(
    "Restore order validated:",
    order.join(" -> "),
  );

  await db.$transaction(
    async (tx) => {
      if (tableNames.length) {
        await tx.$executeRawUnsafe(
          `TRUNCATE TABLE ${tableNames
            .map(quoteIdent)
            .join(", ")} RESTART IDENTITY CASCADE`,
        );
      }

      for (const table of order) {
        const rows =
          envelope.payload.tables[table].rows;

        for (const batch of chunks(rows)) {
          if (!batch.length) continue;

          await tx.$executeRawUnsafe(
            `
              INSERT INTO ${quoteIdent(table)}
              SELECT *
              FROM json_populate_recordset(
                NULL::${quoteIdent(table)},
                $1::json
              )
            `,
            JSON.stringify(batch),
          );
        }
      }
    },
    {
      maxWait: 10_000,
      timeout: 300_000,
    },
  );

  for (const table of tableNames) {
    const rows = await db.$queryRawUnsafe(
      `SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`,
    );

    const actual = Number(
      rows?.[0]?.count || 0,
    );

    const expected = Number(
      envelope.payload.tables[table].rowCount,
    );

    if (actual !== expected) {
      throw new Error(
        `Row-count mismatch for ${table}: expected ${expected}, got ${actual}`,
      );
    }
  }

  console.log(
    "RESTORE PASS — all backed-up table counts verified.",
  );
} finally {
  await db.$disconnect();
}
