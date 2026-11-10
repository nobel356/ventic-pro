import { prisma } from "@/lib/prisma";
import { backupFreshnessSnapshot } from "@/lib/backup-freshness";

const EXPECTED_SHA_KEY =
  "production.expectedGithubSha";

type GateStatus =
  | "PASS"
  | "WARN"
  | "FAIL";

export type ProductionGate = {
  key: string;
  label: string;
  status: GateStatus;
  value: string;
  detail: string;
};

function settingString(
  value: unknown,
) {
  if (typeof value === "string") {
    return value;
  }

  if (
    value &&
    typeof value === "object" &&
    "value" in
      (value as any)
  ) {
    return String(
      (value as any).value ||
        "",
    );
  }

  return "";
}

export async function buildProductionVerification() {
  const [
    backup,
    restore,
    expectedSetting,
    migrationRows,
    openCritical,
  ] =
    await Promise.all([
      backupFreshnessSnapshot(),
      prisma.disasterRecoveryRecord.findFirst({
        where: {
          recordType:
            "RESTORE_DRILL",
          status: {
            in: [
              "PASS",
              "PARTIAL_PASS",
            ],
          },
        },
        orderBy: {
          occurredAt: "desc",
        },
      }),
      prisma.runtimeSetting.findUnique({
        where: {
          key: EXPECTED_SHA_KEY,
        },
      }),
      prisma.$queryRawUnsafe<
        Array<{
          count: bigint;
          latest:
            | Date
            | null;
        }>
      >(
        `SELECT
          COUNT(*)::bigint AS count,
          MAX(finished_at) AS latest
        FROM "_prisma_migrations"
        WHERE rolled_back_at IS NULL`,
      ),
      prisma.opsChangeLog.count({
        where: {
          kind: "INCIDENT",
          severity: "CRITICAL",
          status: {
            in: [
              "OPEN",
              "MONITORING",
            ],
          },
        },
      }),
    ]);

  const runtimeSha =
    String(
      process.env
        .VERCEL_GIT_COMMIT_SHA ||
        "",
    ).trim();

  const expectedGithubSha =
    settingString(
      expectedSetting?.value,
    ).trim();

  const migrationCount =
    Number(
      migrationRows[0]?.count ||
        0,
    );

  const gates: ProductionGate[] =
    [];

  gates.push({
    key: "runtime-sha",
    label:
      "Vercel Runtime SHA",
    status:
      runtimeSha
        ? "PASS"
        : "WARN",
    value:
      runtimeSha
        ? runtimeSha.slice(
            0,
            12,
          )
        : "Unavailable",
    detail:
      runtimeSha
        ? "Runtime deployment exposes a Git commit SHA."
        : "VERCEL_GIT_COMMIT_SHA is not available in this runtime.",
  });

  gates.push({
    key: "github-match",
    label:
      "GitHub main ↔ Vercel",
    status:
      !expectedGithubSha
        ? "WARN"
        : runtimeSha &&
            runtimeSha ===
              expectedGithubSha
          ? "PASS"
          : "FAIL",
    value:
      !expectedGithubSha
        ? "Evidence missing"
        : runtimeSha ===
            expectedGithubSha
          ? "MATCH"
          : "MISMATCH",
    detail:
      !expectedGithubSha
        ? "The app has no direct GitHub token. Record the externally verified main SHA after production audits."
        : `Expected ${expectedGithubSha.slice(0, 12)} vs runtime ${runtimeSha ? runtimeSha.slice(0, 12) : "missing"}.`,
  });

  gates.push({
    key: "migrations",
    label:
      "Database migrations",
    status:
      migrationCount > 0
        ? "PASS"
        : "FAIL",
    value:
      String(
        migrationCount,
      ),
    detail:
      migrationRows[0]
        ?.latest
        ? `Latest finished migration: ${new Date(
            migrationRows[0]
              .latest,
          ).toISOString()}`
        : "No finished migration found.",
  });

  gates.push({
    key: "backup",
    label:
      "Verified DB backup",
    status:
      backup.fresh
        ? "PASS"
        : "FAIL",
    value:
      backup.ageHours === null
        ? "Missing"
        : `${backup.ageHours}h`,
    detail:
      backup.fresh
        ? "Latest verified backup is within the 48h freshness gate."
        : "Backup is missing or stale.",
  });

  gates.push({
    key: "restore",
    label:
      "Restore Drill",
    status:
      restore
        ? "PASS"
        : "WARN",
    value:
      restore
        ? restore.status
        : "Missing",
    detail:
      restore
        ? `Last verified drill: ${restore.occurredAt.toISOString()}`
        : "No verified restore drill recorded.",
  });

  gates.push({
    key: "incidents",
    label:
      "Critical incidents",
    status:
      openCritical === 0
        ? "PASS"
        : "FAIL",
    value:
      String(
        openCritical,
      ),
    detail:
      openCritical === 0
        ? "No open critical incident."
        : "Open critical incidents block a green production state.",
  });

  const failed =
    gates.filter(
      (gate) =>
        gate.status === "FAIL",
    ).length;

  const warned =
    gates.filter(
      (gate) =>
        gate.status === "WARN",
    ).length;

  return {
    status:
      failed > 0
        ? "BLOCKED"
        : warned > 0
          ? "DEGRADED"
          : "GREEN",
    gates,
    runtimeSha,
    expectedGithubSha,
    migrationCount,
    generatedAt:
      new Date().toISOString(),
  };
}

export const productionExpectedShaKey =
  EXPECTED_SHA_KEY;
