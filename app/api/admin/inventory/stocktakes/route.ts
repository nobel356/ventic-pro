import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISSIONS, requirePermission } from "@/lib/auth-v7";
import { technicianBalanceMap } from "@/lib/inventory-balances";

function serialize(stocktake: any) {
  return {
    id: stocktake.id,
    stocktakeNo: stocktake.stocktakeNo,
    status: stocktake.status,
    locationType: stocktake.locationType,
    notes: stocktake.notes,
    technician: stocktake.technician,
    createdBy: stocktake.createdBy,
    approvedBy: stocktake.approvedBy,
    approvedAt: stocktake.approvedAt,
    createdAt: stocktake.createdAt,
    lineCount: stocktake._count?.lines ?? stocktake.lines?.length ?? 0,
  };
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.INVENTORY_VIEW);

    const [stocktakes, technicians] = await Promise.all([
      prisma.stocktake.findMany({
        include: {
          technician: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          approvedBy: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.user.findMany({
        where: { role: "TECHNICIAN", active: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({
      stocktakes: stocktakes.map(serialize),
      technicians,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل جلسات الجرد" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.STOCKTAKE_MANAGE);
    const body = await req.json();
    const locationType = body?.locationType === "TECHNICIAN" ? "TECHNICIAN" : "COMPANY";
    const technicianId =
      locationType === "TECHNICIAN" ? String(body?.technicianId || "") : null;
    const notes = String(body?.notes || "").trim() || null;

    if (locationType === "TECHNICIAN" && !technicianId) {
      return NextResponse.json({ error: "اختر الفني المراد جرد عهدته" }, { status: 400 });
    }

    if (technicianId) {
      const technician = await prisma.user.findFirst({
        where: { id: technicianId, role: "TECHNICIAN", active: true },
        select: { id: true },
      });
      if (!technician) {
        return NextResponse.json({ error: "الفني غير موجود أو غير نشط" }, { status: 404 });
      }
    }

    const items = await prisma.inventoryItem.findMany({
      where: { active: true },
      orderBy: { nameAr: "asc" },
    });

    if (items.length === 0) {
      return NextResponse.json({ error: "لا توجد أصناف نشطة لبدء الجرد" }, { status: 400 });
    }

    let balances = new Map<string, number>();
    if (technicianId) {
      balances = await technicianBalanceMap(prisma, technicianId);
    }

    const stocktakeNo = `STK-${new Date().getFullYear()}-${Date.now()
      .toString()
      .slice(-8)}`;

    const stocktake = await prisma.$transaction(async (tx) => {
      const created = await tx.stocktake.create({
        data: {
          stocktakeNo,
          locationType,
          technicianId,
          createdById: actor.id,
          notes,
          lines: {
            create: items.map((item) => ({
              itemId: item.id,
              expectedQty:
                locationType === "COMPANY"
                  ? Number(item.quantity)
                  : balances.get(`${technicianId}:${item.id}`) || 0,
            })),
          },
        },
        include: {
          technician: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { lines: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "STOCKTAKE_CREATED",
          newValue: {
            stocktakeId: created.id,
            stocktakeNo,
            locationType,
            technicianId,
            itemCount: items.length,
          },
        },
      });

      return created;
    });

    return NextResponse.json(serialize(stocktake), { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر إنشاء جلسة الجرد" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
