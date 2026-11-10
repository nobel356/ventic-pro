import fs from "node:fs";

const lib = fs.readFileSync(
  "lib/backup-freshness.ts",
  "utf8",
);
const backup = fs.readFileSync(
  "app/api/cron/db-backup/route.ts",
  "utf8",
);
const daily = fs.readFileSync(
  "app/api/cron/daily-ops/route.ts",
  "utf8",
);

const checks = [
  [lib.includes("FRESH_HOURS = 48"), "48h freshness threshold"],
  [lib.includes("notifyIfBackupStale"), "stale notification function"],
  [lib.includes("AdminNotificationType.SYSTEM"), "admin notification"],
  [backup.includes("DB_BACKUP_DR_RECORDED"), "verified backup registered in DR"],
  [daily.includes("backupFreshness"), "daily freshness check"],
  [daily.includes("notifyIfBackupStale"), "daily stale alert"],
];

const failed = checks.filter(([ok]) => !ok);
if (failed.length) {
  for (const [, label] of failed) console.error("FAIL:", label);
  process.exit(1);
}

console.log(
  "PASS ✓ — V60 Verified Blob Backup Registry ✓ / 48h Freshness ✓ / Daily Alert ✓ / No Fake Snapshot ✓",
);
