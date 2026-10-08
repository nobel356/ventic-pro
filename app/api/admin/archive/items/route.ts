import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import {
  PERMISSIONS,
} from "@/lib/permission-config";
import {
  rawPrisma,
} from "@/lib/prisma";

export async function GET() {
  try {
    const actor =
      await requireArchiveActor(
        PERMISSIONS.ARCHIVE_VIEW,
      );

    await requireVaultUnlocked(
      actor.id,
    );

    const [
      orders,
      users,
      logs,
    ] = await Promise.all([
      rawPrisma.order.findMany({
        where: {
          archivedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          estimatedTotal: true,
          finalTotal: true,
          archivedAt: true,
          archivedById: true,
          archivedByLabel: true,
          archiveReason: true,
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
        orderBy: {
          archivedAt: "desc",
        },
        take: 500,
      }),
      rawPrisma.user.findMany({
        where: {
          archivedAt: {
            not: null,
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          archivedAt: true,
          archivedById: true,
          archivedByLabel: true,
          archiveReason: true,
        },
        orderBy: {
          archivedAt: "desc",
        },
        take: 500,
      }),
      rawPrisma.auditLog.findMany({
        where: {
          action: {
            startsWith:
              "ARCHIVE_",
          },
        },
        select: {
          id: true,
          orderId: true,
          actorId: true,
          actorLabel: true,
          action: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 250,
      }),
    ]);

    return NextResponse.json({
      orders,
      users,
      logs,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تحميل الأرشيف.",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
