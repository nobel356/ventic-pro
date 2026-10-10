import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import {
  requireArchiveActor,
  requireVaultUnlocked,
} from "@/lib/archive-vault";
import { PERMISSIONS } from "@/lib/permission-config";
import { rawPrisma } from "@/lib/prisma";
import { technicianMovementDelta } from "@/lib/inventory-balances";

function reasonFrom(body: any) {
  return String(body?.reason || "").trim();
}

async function technicianBalancesForItem(itemId: string) {
  const movements = await rawPrisma.inventoryMovement.findMany({
    where: {
      itemId,
      technicianId: { not: null },
    },
    select: {
      technicianId: true,
      type: true,
      quantity: true,
      note: true,
    },
  });

  const balances = new Map<string, number>();

  for (const movement of movements) {
    if (!movement.technicianId) continue;
    const current = balances.get(movement.technicianId) || 0;
    balances.set(
      movement.technicianId,
      current + technicianMovementDelta(movement),
    );
  }

  return balances;
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

    const item = await rawPrisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "صنف المخزون غير موجود." },
        { status: 404 },
      );
    }

    if (item.archivedAt) {
      return NextResponse.json(
        { error: "الصنف موجود بالفعل في الأرشيف." },
        { status: 409 },
      );
    }

    const companyQuantity = Number(item.quantity);
    const technicianBalances = await technicianBalancesForItem(id);
    const nonZeroTechnicians = [...technicianBalances.entries()].filter(
      ([, quantity]) => Math.abs(quantity) > 0.000001,
    );

    const draftStocktakes = await rawPrisma.stocktakeLine.count({
      where: {
        itemId: id,
        stocktake: {
          status: "DRAFT",
        },
      },
    });

    if (
      Math.abs(companyQuantity) > 0.000001 ||
      nonZeroTechnicians.length > 0 ||
      draftStocktakes > 0
    ) {
      return NextResponse.json(
        {
          error:
            `لا يمكن أرشفة الصنف قبل تصفير الرصيد والعهدة وإغلاق الجرد المفتوح. ` +
            `رصيد الشركة: ${companyQuantity.toLocaleString("ar-EG")} ${item.unit}، ` +
            `عهد فنيين غير صفرية: ${nonZeroTechnicians.length}، ` +
            `جلسات جرد مفتوحة: ${draftStocktakes}.`,
        },
        { status: 409 },
      );
    }

    const archivedAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: { id },
        data: {
          archivedAt,
          archivedById: actor.id,
          archivedByLabel: actor.name,
          archiveReason: reason,
          archiveState: {
            active: item.active,
          },
          active: false,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: "ARCHIVE_INVENTORY_ITEM",
          oldValue: {
            itemId: item.id,
            sku: item.sku,
            nameAr: item.nameAr,
            active: item.active,
            companyQuantity,
          },
          newValue: {
            itemId: item.id,
            archivedAt: archivedAt.toISOString(),
            reason,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر أرشفة صنف المخزون." },
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
    const item = await rawPrisma.inventoryItem.findUnique({
      where: { id },
    });

    if (!item || !item.archivedAt) {
      return NextResponse.json(
        { error: "صنف المخزون غير موجود في الأرشيف." },
        { status: 404 },
      );
    }

    const state =
      item.archiveState &&
      typeof item.archiveState === "object" &&
      !Array.isArray(item.archiveState)
        ? (item.archiveState as Record<string, any>)
        : {};

    const restoreActive = state.active !== false;
    const restoredAt = new Date();

    await rawPrisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
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
          action: "ARCHIVE_INVENTORY_ITEM_RESTORED",
          oldValue: {
            itemId: item.id,
            archivedAt: item.archivedAt!.toISOString(),
            archivedByLabel: item.archivedByLabel,
            archiveReason: item.archiveReason,
          },
          newValue: {
            itemId: item.id,
            restoredAt: restoredAt.toISOString(),
            active: restoreActive,
          },
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر استرجاع صنف المخزون." },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
