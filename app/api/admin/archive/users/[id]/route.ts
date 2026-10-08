import {
  Prisma,
} from "@prisma/client";
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

function reasonFrom(
  body: any,
) {
  return String(
    body?.reason || "",
  ).trim();
}

export async function DELETE(
  req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const actor =
      await requireArchiveActor(
        PERMISSIONS.ARCHIVE_MANAGE,
      );
    const { id } =
      await params;
    const body =
      await req.json();
    const reason =
      reasonFrom(body);

    if (reason.length < 3) {
      return NextResponse.json(
        {
          error:
            "اكتب سبب الأرشفة (3 أحرف على الأقل).",
        },
        { status: 400 },
      );
    }

    if (id === actor.id) {
      return NextResponse.json(
        {
          error:
            "لا يمكنك أرشفة حسابك الحالي.",
        },
        { status: 400 },
      );
    }

    const target =
      await rawPrisma.user.findUnique({
        where: { id },
      });

    if (!target) {
      return NextResponse.json(
        {
          error:
            "المستخدم غير موجود.",
        },
        { status: 404 },
      );
    }

    if (target.archivedAt) {
      return NextResponse.json(
        {
          error:
            "المستخدم موجود بالفعل في الأرشيف.",
        },
        { status: 409 },
      );
    }

    if (
      target.role ===
      "SUPER_ADMIN" &&
      target.active
    ) {
      const activeOwners =
        await rawPrisma.user.count({
          where: {
            role:
              "SUPER_ADMIN",
            active: true,
            archivedAt: null,
          },
        });

      if (activeOwners <= 1) {
        return NextResponse.json(
          {
            error:
              "لا يمكن أرشفة آخر مدير نظام نشط.",
          },
          { status: 409 },
        );
      }
    }

    if (
      target.role ===
      "TECHNICIAN"
    ) {
      const [
        activeOrders,
        maintenance,
        complaints,
        futureSlots,
      ] = await Promise.all([
        rawPrisma.order.count({
          where: {
            technicianId:
              target.id,
            archivedAt: null,
            status: {
              notIn: [
                "COMPLETED",
                "CANCELLED",
              ],
            },
          },
        }),
        rawPrisma.maintenanceRequest.count({
          where: {
            technicianId:
              target.id,
            order: {
              archivedAt: null,
            },
            status: {
              in: [
                "OPEN",
                "SCHEDULED",
                "IN_PROGRESS",
              ],
            },
          },
        }),
        rawPrisma.complaint.count({
          where: {
            technicianId:
              target.id,
            order: {
              archivedAt: null,
            },
            status: {
              in: [
                "OPEN",
                "SCHEDULED",
                "IN_PROGRESS",
              ],
            },
          },
        }),
        rawPrisma.technicianSlot.count({
          where: {
            technicianId:
              target.id,
            endsAt: {
              gt: new Date(),
            },
            OR: [
              {
                orderId: null,
              },
              {
                order: {
                  archivedAt: null,
                  status: {
                    notIn: [
                      "COMPLETED",
                      "CANCELLED",
                    ],
                  },
                },
              },
            ],
          },
        }),
      ]);

      if (
        activeOrders ||
        maintenance ||
        complaints ||
        futureSlots
      ) {
        return NextResponse.json(
          {
            error:
              `لا يمكن أرشفة الفني قبل إعادة توزيع الشغل النشط. ` +
              `طلبات: ${activeOrders}، صيانة: ${maintenance}، شكاوى: ${complaints}، مواعيد: ${futureSlots}.`,
          },
          { status: 409 },
        );
      }
    }

    const archivedAt =
      new Date();

    await rawPrisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            archivedAt,
            archivedById:
              actor.id,
            archivedByLabel:
              actor.name,
            archiveReason:
              reason,
            archiveState: {
              active:
                target.active,
            },
            active: false,
          },
        });

        await tx.session.deleteMany({
          where: {
            userId: id,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId:
              actor.id,
            actorLabel:
              actor.name,
            action:
              "ARCHIVE_USER",
            oldValue: {
              targetUserId:
                target.id,
              name:
                target.name,
              login:
                target.email,
              role:
                target.role,
              active:
                target.active,
            },
            newValue: {
              targetUserId:
                target.id,
              archivedAt:
                archivedAt.toISOString(),
              reason,
            },
          },
        });
      },
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر أرشفة المستخدم.",
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

export async function POST(
  _req: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  },
) {
  try {
    const actor =
      await requireArchiveActor(
        PERMISSIONS.ARCHIVE_RESTORE,
      );

    await requireVaultUnlocked(
      actor.id,
    );

    const { id } =
      await params;

    const target =
      await rawPrisma.user.findUnique({
        where: { id },
      });

    if (
      !target ||
      !target.archivedAt
    ) {
      return NextResponse.json(
        {
          error:
            "المستخدم غير موجود في الأرشيف.",
        },
        { status: 404 },
      );
    }

    const state =
      (target.archiveState &&
      typeof target.archiveState ===
        "object" &&
      !Array.isArray(
        target.archiveState,
      )
        ? target.archiveState
        : {}) as Record<
        string,
        any
      >;

    const restoreActive =
      state.active !== false;

    const restoredAt =
      new Date();

    await rawPrisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id },
          data: {
            archivedAt: null,
            archivedById: null,
            archivedByLabel:
              null,
            archiveReason:
              null,
            archiveState:
              Prisma.DbNull,
            active:
              restoreActive,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId:
              actor.id,
            actorLabel:
              actor.name,
            action:
              "ARCHIVE_USER_RESTORED",
            oldValue: {
              targetUserId:
                target.id,
              archivedAt:
                target.archivedAt.toISOString(),
              archivedByLabel:
                target.archivedByLabel,
              archiveReason:
                target.archiveReason,
            },
            newValue: {
              targetUserId:
                target.id,
              restoredAt:
                restoredAt.toISOString(),
              active:
                restoreActive,
            },
          },
        });
      },
    );

    return NextResponse.json({
      ok: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر استرجاع المستخدم.",
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
