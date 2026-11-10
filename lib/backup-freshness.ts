import { AdminNotificationType, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notifyAdmins } from "@/lib/admin-notifications";

const FRESH_HOURS = 48;
const HOUR_MS = 60 * 60 * 1000;

export async function latestVerifiedBackup() {
  const drRecord =
    await prisma.disasterRecoveryRecord.findFirst({
      where: {
        recordType: "BACKUP",
        status: "PASS",
      },
      orderBy: {
        occurredAt: "desc",
      },
    });

  return drRecord;
}

export async function backupFreshnessSnapshot(
  now = new Date(),
) {
  const latest =
    await latestVerifiedBackup();

  const ageHours =
    latest
      ? Number(
          (
            (now.getTime() -
              latest.occurredAt.getTime()) /
            HOUR_MS
          ).toFixed(1),
        )
      : null;

  return {
    latest,
    ageHours,
    fresh:
      ageHours !== null &&
      ageHours <= FRESH_HOURS,
    thresholdHours: FRESH_HOURS,
  };
}

export async function notifyIfBackupStale(
  dateKey: string,
) {
  const snapshot =
    await backupFreshnessSnapshot();

  if (snapshot.fresh) {
    return {
      notified: false,
      ...snapshot,
    };
  }

  await notifyAdmins({
    type: AdminNotificationType.SYSTEM,
    title:
      "Backup freshness تحتاج تدخل",
    message:
      snapshot.ageHours === null
        ? "لا يوجد Backup موثق ناجح في DR Registry."
        : `آخر Backup موثق عمرها ${snapshot.ageHours} ساعة، وتجاوزت حد ${snapshot.thresholdHours} ساعة.`,
    href:
      "/admin/disaster-recovery",
    roles: [
      UserRole.SUPER_ADMIN,
    ],
    dedupeKey:
      `backup-freshness:${dateKey}`,
  });

  return {
    notified: true,
    ...snapshot,
  };
}
