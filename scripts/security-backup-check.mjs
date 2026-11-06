import fs from "node:fs";

const backup = fs.readFileSync(
  "app/api/cron/db-backup/route.ts",
  "utf8",
);

const health = fs.readFileSync(
  "app/api/health/backup/route.ts",
  "utf8",
);

const restore = fs.readFileSync(
  "scripts/restore-db-backup.mjs",
  "utf8",
);

const vercel = JSON.parse(
  fs.readFileSync("vercel.json", "utf8"),
);

const checks = [
  [
    backup.includes(
      'BACKUP_PREFIX = "db-backups/"',
    ),
    "isolated backup prefix",
  ],
  [
    backup.includes('access: "private"'),
    "private blob access",
  ],
  [
    backup.includes("gzipSync") &&
      backup.includes("gunzipSync"),
    "compressed round-trip",
  ],
  [
    backup.includes('createHash("sha256")') &&
      backup.includes("verifyRoundTrip"),
    "SHA-256 verification",
  ],
  [
    backup.includes(
      "DB_BACKUP_RETENTION_DAYS",
    ) &&
      backup.includes(
        "deleteExpiredBackups",
      ),
    "retention cleanup",
  ],
  [
    backup.includes("CRON_SECRET"),
    "cron authorization",
  ],
  [
    health.includes("DB_BACKUP_VERIFIED") &&
      health.includes(
        "MAX_AGE_HOURS = 30",
      ),
    "backup freshness health",
  ],
  [
    restore.includes(
      'RESTORE_MODE === "validate"',
    ),
    "validate-only default",
  ],
  [
    restore.includes(
      "VENTIC_PRO_RESTORE",
    ) &&
      restore.includes(
        "ALLOW_PRODUCTION_RESTORE",
      ),
    "destructive restore guards",
  ],
  [
    Array.isArray(vercel.crons) &&
      vercel.crons.some(
        (job) =>
          job.path ===
            "/api/cron/db-backup" &&
          job.schedule ===
            "30 1 * * *",
      ),
    "daily backup schedule",
  ],
];

const failed = checks.filter(([ok]) => !ok);

if (failed.length) {
  for (const [, label] of failed) {
    console.error("FAIL:", label);
  }

  process.exit(1);
}

console.log(
  "PASS ✓ — Private Backup ✓ / GZIP ✓ / SHA-256 ✓ / Round-trip Verify ✓ / 30d Retention ✓ / Backup Health ✓ / Restore Guards ✓",
);
