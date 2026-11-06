import { NextResponse } from "next/server";
import { del, get, list, put } from "@vercel/blob";
import { createHash } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";
import { rawPrisma } from "@/lib/prisma";
import {
  safeDiagnostic,
  safeDiagnosticError,
} from "@/lib/safe-diagnostics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BACKUP_PREFIX = "db-backups/";
const DAY_MS = 24 * 60 * 60 * 1000;

const EXCLUDED_TABLES = new Set([
  "_prisma_migrations",
  "Session",
  "CustomerSession",
  "CustomerPasswordReset",
  "SecurityRateLimit",
  "IdempotencyRequest",
]);

type BackupTable = {
  rowCount: number;
  sha256: string;
  rows: unknown[];
};

type BackupPayload = {
  format: "ventic-pro-db-backup-v1";
  createdAt: string;
  revision: string | null;
  excludedTables: string[];
  totalRows: number;
  tables: Record<string, BackupTable>;
};

type BackupEnvelope = {
  sha256: string;
  payload: BackupPayload;
};

function authorized(req: Request) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  const auth = String(req.headers.get("authorization") || "").trim();

  return Boolean(secret) && auth === `Bearer ${secret}`;
}

function sha256(input: string | Buffer) {
  return createHash("sha256")
    .update(input)
    .digest("hex");
}

function quoteIdent(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function normalize(value: unknown): unknown {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value ?? null;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Buffer.isBuffer(value)) {
    return `\\x${value.toString("hex")}`;
  }

  if (value instanceof Uint8Array) {
    return `\\x${Buffer.from(value).toString("hex")}`;
  }

  if (Array.isArray(value)) {
    return value.map(normalize);
  }

  if (typeof value === "object") {
    const decimalLike = value as {
      constructor?: { name?: string };
      toString?: () => string;
    };

    if (
      decimalLike.constructor?.name === "Decimal" &&
      typeof decimalLike.toString === "function"
    ) {
      return decimalLike.toString();
    }

    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(
        ([key, item]) => [key, normalize(item)],
      ),
    );
  }

  return String(value);
}

function retentionDays() {
  const parsed = Number(
    process.env.DB_BACKUP_RETENTION_DAYS || "30",
  );

  if (!Number.isFinite(parsed)) return 30;

  return Math.max(
    7,
    Math.min(365, Math.floor(parsed)),
  );
}

async function deleteExpiredBackups(
  nowMs: number,
  keepUrl: string,
) {
  const cutoff = nowMs - retentionDays() * DAY_MS;
  const expired: string[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({
      prefix: BACKUP_PREFIX,
      limit: 100,
      cursor,
    });

    for (const blob of page.blobs) {
      const uploadedAt = new Date(blob.uploadedAt).getTime();

      if (
        blob.url !== keepUrl &&
        Number.isFinite(uploadedAt) &&
        uploadedAt < cutoff
      ) {
        expired.push(blob.url);
      }
    }

    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  if (expired.length) {
    await del(expired);
  }

  return expired.length;
}

async function verifyRoundTrip(pathname: string) {
  const result = await get(pathname, {
    access: "private",
  });

  if (!result || result.statusCode !== 200) {
    throw new Error(
      "Backup round-trip download failed.",
    );
  }

  const zipped = Buffer.from(
    await new Response(result.stream).arrayBuffer(),
  );

  const decoded = gunzipSync(zipped).toString("utf8");
  const envelope = JSON.parse(decoded) as BackupEnvelope;

  const actual = sha256(
    JSON.stringify(envelope.payload),
  );

  if (actual !== envelope.sha256) {
    throw new Error(
      "Backup SHA-256 verification failed.",
    );
  }

  return {
    envelope,
    compressedBytes: zipped.length,
  };
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json(
      { error: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const startedAt = Date.now();

  try {
    const tableRows = await rawPrisma.$queryRawUnsafe<
      Array<{ tablename: string }>
    >(`
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename ASC
    `);

    const tableNames = tableRows
      .map((row) => String(row.tablename))
      .filter((table) => !EXCLUDED_TABLES.has(table));

    const tables: Record<string, BackupTable> = {};
    let totalRows = 0;

    for (const table of tableNames) {
      const rows = await rawPrisma.$queryRawUnsafe<
        Array<Record<string, unknown>>
      >(`SELECT * FROM ${quoteIdent(table)}`);

      const normalized = rows.map(
        (row) =>
          normalize(row) as Record<string, unknown>,
      );

      const tableJson = JSON.stringify(normalized);

      tables[table] = {
        rowCount: normalized.length,
        sha256: sha256(tableJson),
        rows: normalized,
      };

      totalRows += normalized.length;
    }

    const payload: BackupPayload = {
      format: "ventic-pro-db-backup-v1",
      createdAt: new Date().toISOString(),
      revision:
        process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 40) ||
        null,
      excludedTables: [...EXCLUDED_TABLES].sort(),
      totalRows,
      tables,
    };

    const payloadJson = JSON.stringify(payload);

    const envelope: BackupEnvelope = {
      sha256: sha256(payloadJson),
      payload,
    };

    const compressed = gzipSync(
      Buffer.from(JSON.stringify(envelope), "utf8"),
      { level: 9 },
    );

    const stamp = payload.createdAt.replace(/[:.]/g, "-");
    const pathname = `${BACKUP_PREFIX}${stamp}.json.gz`;

    const blob = await put(pathname, compressed, {
      access: "private",
      addRandomSuffix: false,
      contentType: "application/gzip",
    });

    let verified;

    try {
      verified = await verifyRoundTrip(blob.pathname);
    } catch (error) {
      await del(blob.url).catch(() => {});
      throw error;
    }

    const deletedOld = await deleteExpiredBackups(
      Date.now(),
      blob.url,
    ).catch((error) => {
      safeDiagnosticError(
        "cron.db_backup.retention",
        error,
      );
      return 0;
    });

    await rawPrisma.auditLog
      .create({
        data: {
          actorLabel: "system:db-backup",
          action: "DB_BACKUP_VERIFIED",
          newValue: {
            pathname: blob.pathname,
            sha256: envelope.sha256,
            tables: tableNames.length,
            totalRows,
            compressedBytes: verified.compressedBytes,
            retentionDays: retentionDays(),
            deletedOld,
            revision: payload.revision,
          },
        },
      })
      .catch((error) => {
        safeDiagnosticError(
          "cron.db_backup.audit",
          error,
        );
      });

    safeDiagnostic("cron.db_backup.complete", {
      pathname: blob.pathname,
      tables: tableNames.length,
      totalRows,
      compressedBytes: verified.compressedBytes,
      deletedOld,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      verified: true,
      pathname: blob.pathname,
      tables: tableNames.length,
      totalRows,
      compressedBytes: verified.compressedBytes,
      retentionDays: retentionDays(),
      deletedOld,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    safeDiagnosticError(
      "cron.db_backup.failed",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error: "DB_BACKUP_FAILED",
        durationMs: Date.now() - startedAt,
      },
      { status: 500 },
    );
  }
}
