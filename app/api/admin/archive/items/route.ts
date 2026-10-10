import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import { PERMISSIONS } from "@/lib/permission-config";
import { rawPrisma } from "@/lib/prisma";

export async function GET() {
  try {
    const actor = await requireArchiveActor(
      PERMISSIONS.ARCHIVE_VIEW,
    );
    await requireVaultUnlocked(actor.id);

    const [
      orders,
      users,
      customers,
      leads,
      suppliers,
      inventory,
      logs,
    ] = await Promise.all([
      rawPrisma.order.findMany({
        where: {
          archivedAt: { not: null },
        },
        select: {
          id: true,
          orderNo: true,
          status: true,
          estimatedTotal: true,
          finalTotal: true,
          archivedAt: true,
          archivedByLabel: true,
          archiveReason: true,
          customer: {
            select: {
              name: true,
              phone: true,
            },
          },
        },
        orderBy: { archivedAt: "desc" },
        take: 500,
      }),

      rawPrisma.user.findMany({
        where: {
          archivedAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          archivedAt: true,
          archivedByLabel: true,
          archiveReason: true,
        },
        orderBy: { archivedAt: "desc" },
        take: 500,
      }),

      rawPrisma.customer.findMany({
        where: {
          archivedAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          active: true,
          archivedAt: true,
          archivedByLabel: true,
          archiveReason: true,
          _count: {
            select: {
              orders: true,
              properties: true,
            },
          },
        },
        orderBy: { archivedAt: "desc" },
        take: 500,
      }),

      rawPrisma.lead.findMany({
        where: {
          archivedAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          source: true,
          status: true,
          currentStep: true,
          archivedAt: true,
          archivedByLabel: true,
          archiveReason: true,
        },
        orderBy: { archivedAt: "desc" },
        take: 500,
      }),

      rawPrisma.supplier.findMany({
        where: {
          archivedAt: { not: null },
        },
        select: {
          id: true,
          name: true,
          phone: true,
          taxNumber: true,
          active: true,
          archivedAt: true,
          archivedByLabel: true,
          archiveReason: true,
          _count: {
            select: {
              purchases: true,
            },
          },
        },
        orderBy: { archivedAt: "desc" },
        take: 500,
      }),

      rawPrisma.inventoryItem.findMany({
        where: {
          archivedAt: { not: null },
        },
        select: {
          id: true,
          sku: true,
          nameAr: true,
          unit: true,
          quantity: true,
          active: true,
          archivedAt: true,
          archivedByLabel: true,
          archiveReason: true,
        },
        orderBy: { archivedAt: "desc" },
        take: 500,
      }),

      rawPrisma.auditLog.findMany({
        where: {
          action: {
            startsWith: "ARCHIVE_",
          },
        },
        select: {
          id: true,
          orderId: true,
          actorId: true,
          actorLabel: true,
          action: true,
          oldValue: true,
          newValue: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 400,
      }),
    ]);

    return NextResponse.json({
      orders,
      users,
      customers,
      leads,
      suppliers,
      inventory,
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
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
