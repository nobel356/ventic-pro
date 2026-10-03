import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  can,
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  movementLabel,
  parseInventoryNote,
  signedTechnicianDelta,
} from "@/lib/inventory";

export async function GET() {
  try {
    const actor = await requirePermission(
      PERMISSIONS.INVENTORY_VIEW,
    );

    const [items, movements, technicians, orders] =
      await Promise.all([
        prisma.inventoryItem.findMany({
          orderBy: [{ active: "desc" }, { nameAr: "asc" }],
        }),
        prisma.inventoryMovement.findMany({
          include: {
            item: {
              select: {
                id: true,
                sku: true,
                nameAr: true,
                unit: true,
              },
            },
            technician: {
              select: {
                id: true,
                name: true,
              },
            },
            order: {
              select: {
                id: true,
                orderNo: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 250,
        }),
        prisma.user.findMany({
          where: {
            role: "TECHNICIAN",
            active: true,
          },
          select: {
            id: true,
            name: true,
          },
          orderBy: { name: "asc" },
        }),
        prisma.order.findMany({
          where: {
            status: {
              notIn: ["COMPLETED", "CANCELLED"],
            },
          },
          select: {
            id: true,
            orderNo: true,
            customer: {
              select: { name: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 200,
        }),
      ]);

    const technicianBalances = new Map<string, number>();

    for (const movement of movements) {
      if (!movement.technicianId) continue;

      const key = `${movement.itemId}:${movement.technicianId}`;
      const current = technicianBalances.get(key) || 0;
      technicianBalances.set(
        key,
        current +
          signedTechnicianDelta({
            type: movement.type,
            quantity: movement.quantity,
            note: movement.note,
          }),
      );
    }

    const itemRows = items.map((item) => {
      const techStocks = technicians
        .map((technician) => ({
          technicianId: technician.id,
          technicianName: technician.name,
          quantity:
            technicianBalances.get(
              `${item.id}:${technician.id}`,
            ) || 0,
        }))
        .filter((row) => Math.abs(row.quantity) > 0.000001);

      const techniciansTotal = techStocks.reduce(
        (sum, row) => sum + row.quantity,
        0,
      );

      return {
        id: item.id,
        sku: item.sku,
        nameAr: item.nameAr,
        unit: item.unit,
        companyQuantity: Number(item.quantity),
        technicianQuantity: techniciansTotal,
        totalQuantity:
          Number(item.quantity) + techniciansTotal,
        reorderLevel: Number(item.reorderLevel),
        active: item.active,
        technicianStocks: techStocks,
        createdAt: item.createdAt,
      };
    });

    const movementRows = movements.map((movement) => {
      const parsed = parseInventoryNote(movement.note);

      return {
        id: movement.id,
        type: movement.type,
        label: movementLabel(
          movement.type,
          movement.note,
        ),
        quantity: Number(movement.quantity),
        note: parsed.note,
        marker: parsed.marker,
        item: movement.item,
        technician: movement.technician,
        order: movement.order,
        createdAt: movement.createdAt,
      };
    });

    const companyTotal = itemRows.reduce(
      (sum, item) => sum + item.companyQuantity,
      0,
    );

    const technicianTotal = itemRows.reduce(
      (sum, item) => sum + item.technicianQuantity,
      0,
    );

    const lowStockCount = itemRows.filter(
      (item) =>
        item.active &&
        item.companyQuantity <= item.reorderLevel,
    ).length;

    return NextResponse.json({
      items: itemRows,
      movements: movementRows,
      technicians,
      orders,
      summary: {
        itemCount: itemRows.length,
        companyTotal,
        technicianTotal,
        lowStockCount,
      },
      permissions: {
        canEdit: can(
          actor.role,
          PERMISSIONS.INVENTORY_EDIT,
          actor.permissions,
        ),
        canMove: can(
          actor.role,
          PERMISSIONS.INVENTORY_MOVE,
          actor.permissions,
        ),
        canAdjust: can(
          actor.role,
          PERMISSIONS.INVENTORY_ADJUST,
          actor.permissions,
        ),
        canViewCost: can(
          actor.role,
          PERMISSIONS.INVENTORY_COST_VIEW,
          actor.permissions,
        ),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.message || "تعذر تحميل بيانات المخزون",
      },
      {
        status:
          error.message === "UNAUTHENTICATED"
            ? 401
            : error.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
