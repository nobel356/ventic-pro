import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import { PERMISSIONS } from "@/lib/permission-config";
import { rawPrisma } from "@/lib/prisma";

function reasonFrom(body: any) {
  return String(body?.reason || "").trim();
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireArchiveActor(
      PERMISSIONS.ARCHIVE_MANAGE,
    );
    await requireVaultUnlocked(actor.id);

    const { id } = await params;
    const body = await req.json();
    const reason = reasonFrom(body);

    if (reason.length < 3) {
      return NextResponse.json(
        { error: "اكتب سبب الأرشفة (3 أحرف على الأقل)." },
        { status: 400 },
      );
    }

    const customer = await rawPrisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "العميل غير موجود." },
        { status: 404 },
      );
    }

    if (customer.archivedAt) {
      return NextResponse.json(
        { error: "العميل موجود بالفعل في الأرشيف." },
        { status: 409 },
      );
    }

    const [activeOrders, dueInvoices, openMaintenance, openComplaints] =
      await Promise.all([
        rawPrisma.order.count({
          where: {
            customerId: id,
            archivedAt: null,
            status: {
              notIn: ["COMPLETED", "CANCELLED"],
            },
          },
        }),
        rawPrisma.invoice.count({
          where: {
            due: { gt: 0 },
            order: {
              customerId: id,
              archivedAt: null,
            },
          },
        }),
        rawPrisma.maintenanceRequest.count({
          where: {
            status: {
              in: ["OPEN", "SCHEDULED", "IN_PROGRESS"],
            },
            order: {
              customerId: id,
              archivedAt: null,
            },
          },
        }),
        rawPrisma.complaint.count({
          where: {
            status: {
              in: ["OPEN", "SCHEDULED", "IN_PROGRESS"],
            },
            order: {
              customerId: id,
              archivedAt: null,
            },
          },
        }),
      ]);

    if (
      activeOrders ||
      dueInvoices ||
      openMaintenance ||
      openComplaints
    ) {
      return NextResponse.json(
        {
          error:
            `لا يمكن أرشفة العميل قبل إغلاق التزاماته النشطة. ` +
            `طلبات نشطة: ${activeOrders}، فواتير عليها متبقي: ${dueInvoices}، ` +
            `صيانة مفتوحة: ${openMaintenance}، شكاوى مفتوحة: ${openComplaints}.`,
        },
        { status: 409 },
      );
    }

    const archivedAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          archivedAt,
          archivedById: actor.id,
          archivedByLabel: actor.name,
          archiveReason: reason,
          archiveState: {
            active: customer.active,
          },
          active: false,
        },
      });

      await tx.customerSession.deleteMany({
        where: { customerId: id },
      });

      await tx.customerPasswordReset.updateMany({
        where: {
          customerId: id,
          usedAt: null,
        },
        data: {
          usedAt: archivedAt,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_CUSTOMER",
          oldValue: {
            customerId: customer.id,
            name: customer.name,
            phone: customer.phone,
            active: customer.active,
          },
          newValue: {
            customerId: customer.id,
            archivedAt: archivedAt.toISOString(),
            reason,
            sessionsRevoked: true,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر أرشفة العميل." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireArchiveActor(
      PERMISSIONS.ARCHIVE_RESTORE,
    );
    await requireVaultUnlocked(actor.id);

    const { id } = await params;

    const customer = await rawPrisma.customer.findUnique({
      where: { id },
    });

    if (!customer || !customer.archivedAt) {
      return NextResponse.json(
        { error: "العميل غير موجود في الأرشيف." },
        { status: 404 },
      );
    }

    const state =
      customer.archiveState &&
      typeof customer.archiveState === "object" &&
      !Array.isArray(customer.archiveState)
        ? (customer.archiveState as Record<string, any>)
        : {};

    const restoreActive = state.active !== false;
    const restoredAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id },
        data: {
          archivedAt: null,
          archivedById: null,
          archivedByLabel: null,
          archiveReason: null,
          archiveState: Prisma.DbNull,
          active: restoreActive,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_CUSTOMER_RESTORED",
          oldValue: {
            customerId: customer.id,
            archivedAt: customer.archivedAt!.toISOString(),
            archivedByLabel: customer.archivedByLabel,
            archiveReason: customer.archiveReason,
          },
          newValue: {
            customerId: customer.id,
            restoredAt: restoredAt.toISOString(),
            active: restoreActive,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر استرجاع العميل." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
