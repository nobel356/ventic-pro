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

    const order =
      await rawPrisma.order.findUnique({
        where: { id },
        include: {
          technicianSlots: true,
          review: true,
        },
      });

    if (!order) {
      return NextResponse.json(
        {
          error:
            "الطلب غير موجود.",
        },
        { status: 404 },
      );
    }

    if (order.archivedAt) {
      return NextResponse.json(
        {
          error:
            "الطلب موجود بالفعل في الأرشيف.",
        },
        { status: 409 },
      );
    }

    const archivedAt =
      new Date();

    const slotSnapshot =
      order.technicianSlots.map(
        (slot) => ({
          technicianId:
            slot.technicianId,
          sourceType:
            slot.sourceType,
          sourceId:
            slot.sourceId,
          startsAt:
            slot.startsAt.toISOString(),
          endsAt:
            slot.endsAt.toISOString(),
        }),
      );

    const reviewSnapshot =
      order.review
        ? {
            isPublished:
              order.review
                .isPublished,
            publishedAt:
              order.review
                .publishedAt
                ?.toISOString() ||
              null,
          }
        : null;

    await rawPrisma.$transaction(
      async (tx) => {
        await tx.order.update({
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
              technicianSlots:
                slotSnapshot,
              review:
                reviewSnapshot,
            },
          },
        });

        await tx.technicianSlot.deleteMany({
          where: {
            orderId: id,
          },
        });

        if (
          order.review?.isPublished
        ) {
          await tx.review.update({
            where: {
              id: order.review.id,
            },
            data: {
              isPublished: false,
              publishedAt: null,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId:
              actor.id,
            actorLabel:
              actor.name,
            orderId:
              order.id,
            action:
              "ARCHIVE_ORDER",
            oldValue: {
              orderNo:
                order.orderNo,
              status:
                order.status,
              technicianSlots:
                slotSnapshot.length,
              reviewPublished:
                Boolean(
                  reviewSnapshot?.isPublished,
                ),
            },
            newValue: {
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
          "تعذر أرشفة الطلب.",
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

    const order =
      await rawPrisma.order.findUnique({
        where: { id },
        include: {
          technician: true,
          review: true,
        },
      });

    if (
      !order ||
      !order.archivedAt
    ) {
      return NextResponse.json(
        {
          error:
            "الطلب غير موجود في الأرشيف.",
        },
        { status: 404 },
      );
    }

    if (
      order.technicianId &&
      ![
        "COMPLETED",
        "CANCELLED",
      ].includes(
        order.status,
      ) &&
      (
        !order.technician ||
        !order.technician.active ||
        order.technician.archivedAt
      )
    ) {
      return NextResponse.json(
        {
          error:
            "الفني المرتبط بالطلب موقوف أو مؤرشف. استرجع الفني أو أعد توزيع الطلب أولًا.",
        },
        { status: 409 },
      );
    }

    const state =
      (order.archiveState &&
      typeof order.archiveState ===
        "object" &&
      !Array.isArray(
        order.archiveState,
      )
        ? order.archiveState
        : {}) as Record<
        string,
        any
      >;

    const slots =
      Array.isArray(
        state.technicianSlots,
      )
        ? state.technicianSlots
        : [];

    for (const slot of slots) {
      const startsAt =
        new Date(
          slot.startsAt,
        );
      const endsAt =
        new Date(
          slot.endsAt,
        );

      if (
        !slot.technicianId ||
        Number.isNaN(
          startsAt.getTime(),
        ) ||
        Number.isNaN(
          endsAt.getTime(),
        )
      ) {
        continue;
      }

      const clash =
        await rawPrisma.technicianSlot.findFirst({
          where: {
            technicianId:
              slot.technicianId,
            startsAt: {
              lt: endsAt,
            },
            endsAt: {
              gt: startsAt,
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
          include: {
            order: {
              select: {
                orderNo: true,
              },
            },
          },
        });

      if (clash) {
        return NextResponse.json(
          {
            error:
              `لا يمكن الاسترجاع لأن هناك موعدًا متعارضًا للفني` +
              `${
                clash.order
                  ?.orderNo
                  ? ` مع الطلب ${clash.order.orderNo}`
                  : ""
              }.`,
          },
          { status: 409 },
        );
      }
    }

    const restoredAt =
      new Date();

    await rawPrisma.$transaction(
      async (tx) => {
        await tx.order.update({
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
          },
        });

        for (const slot of slots) {
          const startsAt =
            new Date(
              slot.startsAt,
            );
          const endsAt =
            new Date(
              slot.endsAt,
            );

          if (
            !slot.technicianId ||
            Number.isNaN(
              startsAt.getTime(),
            ) ||
            Number.isNaN(
              endsAt.getTime(),
            )
          ) {
            continue;
          }

          await tx.technicianSlot.create({
            data: {
              technicianId:
                slot.technicianId,
              orderId:
                order.id,
              sourceType:
                slot.sourceType ||
                null,
              sourceId:
                slot.sourceId ||
                null,
              startsAt,
              endsAt,
            },
          });
        }

        const reviewState =
          state.review &&
          typeof state.review ===
            "object"
            ? state.review
            : null;

        if (
          order.review &&
          reviewState
            ?.isPublished
        ) {
          await tx.review.update({
            where: {
              id: order.review.id,
            },
            data: {
              isPublished: true,
              publishedAt:
                reviewState
                  .publishedAt
                  ? new Date(
                      reviewState.publishedAt,
                    )
                  : restoredAt,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            actorId:
              actor.id,
            actorLabel:
              actor.name,
            orderId:
              order.id,
            action:
              "ARCHIVE_ORDER_RESTORED",
            oldValue: {
              archivedAt:
                order.archivedAt!.toISOString(),
              archivedByLabel:
                order.archivedByLabel,
              archiveReason:
                order.archiveReason,
            },
            newValue: {
              restoredAt:
                restoredAt.toISOString(),
              restoredSlots:
                slots.length,
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
          "تعذر استرجاع الطلب.",
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
