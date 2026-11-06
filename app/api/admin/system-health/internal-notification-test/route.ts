import { AdminNotificationType, UserRole } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";
import { notifyAdmins } from "@/lib/admin-notifications";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user =
    await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401 },
    );
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "غير مسموح" },
      { status: 403 },
    );
  }

  const dedupeKey =
    `qa:internal-notification:${randomUUID()}`;

  let cleanupCount = 0;

  try {
    const recipients =
      await prisma.user.findMany({
        where: {
          active: true,
          role:
            UserRole.SUPER_ADMIN,
        },
        select: {
          id: true,
        },
      });

    if (!recipients.length) {
      return NextResponse.json(
        {
          error:
            "لا يوجد SUPER_ADMIN نشط للاختبار",
        },
        { status: 409 },
      );
    }

    // Fire the same notification concurrently. The DB unique
    // constraint + skipDuplicates must leave exactly one row
    // per recipient.
    await Promise.all(
      Array.from(
        { length: 8 },
        () =>
          notifyAdmins({
            type:
              AdminNotificationType.SYSTEM,
            title:
              "Ventic Pro Internal Notification QA",
            message:
              "Temporary QA row. It is deleted automatically after the test.",
            roles: [
              UserRole.SUPER_ADMIN,
            ],
            dedupeKey,
          }),
      ),
    );

    const rows =
      await prisma.adminNotification.findMany({
        where: {
          dedupeKey,
        },
        select: {
          id: true,
          recipientId: true,
          isRead: true,
          readAt: true,
        },
      });

    const counts =
      new Map<string, number>();

    for (const row of rows) {
      counts.set(
        row.recipientId,
        (counts.get(
          row.recipientId,
        ) || 0) + 1,
      );
    }

    const dedupePassed =
      rows.length ===
        recipients.length &&
      recipients.every(
        (recipient) =>
          counts.get(
            recipient.id,
          ) === 1,
      );

    const currentRow =
      rows.find(
        (row) =>
          row.recipientId ===
          user.id,
      );

    let readUnreadPassed =
      false;

    if (currentRow) {
      const markedAt =
        new Date();

      await prisma.adminNotification.updateMany({
        where: {
          id: currentRow.id,
          recipientId:
            user.id,
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: markedAt,
        },
      });

      const afterRead =
        await prisma.adminNotification.findUnique({
          where: {
            id: currentRow.id,
          },
          select: {
            isRead: true,
            readAt: true,
          },
        });

      readUnreadPassed =
        afterRead?.isRead ===
          true &&
        Boolean(
          afterRead.readAt,
        );
    }

    const foreignRow =
      rows.find(
        (row) =>
          row.recipientId !==
          user.id,
      );

    let isolationPassed =
      true;
    let isolationMode =
      "SINGLE_RECIPIENT";

    if (foreignRow) {
      isolationMode =
        "VERIFIED";

      const blocked =
        await prisma.adminNotification.updateMany({
          where: {
            id: foreignRow.id,
            recipientId:
              user.id,
          },
          data: {
            isRead: true,
            readAt:
              new Date(),
          },
        });

      isolationPassed =
        blocked.count === 0;
    }

    const ok =
      dedupePassed &&
      readUnreadPassed &&
      isolationPassed;

    return NextResponse.json(
      {
        ok,
        checks: {
          concurrentDedupe:
            dedupePassed,
          readUnread:
            readUnreadPassed,
          recipientIsolation:
            isolationPassed,
          isolationMode,
          concurrencyAttempts:
            8,
          activeRecipients:
            recipients.length,
          createdRows:
            rows.length,
        },
      },
      {
        status: ok
          ? 200
          : 500,
      },
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error?.message ||
          "INTERNAL_NOTIFICATION_QA_FAILED",
      },
      { status: 500 },
    );
  } finally {
    try {
      const cleanup =
        await prisma.adminNotification.deleteMany({
          where: {
            dedupeKey,
          },
        });

      cleanupCount =
        cleanup.count;

      console.info(
        "[SYSTEM_HEALTH] internal-notification-qa:cleanup",
        {
          cleanupCount,
        },
      );
    } catch (cleanupError: any) {
      console.error(
        "[SYSTEM_HEALTH] internal-notification-qa:cleanup-failed",
        {
          message:
            cleanupError?.message ||
            "CLEANUP_FAILED",
        },
      );
    }
  }
}
