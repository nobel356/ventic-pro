import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { buildInventoryNote } from "@/lib/inventory";

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.INVENTORY_EDIT,
    );
    const body = await req.json();

    const sku = String(body?.sku || "")
      .trim()
      .toUpperCase();
    const nameAr = String(body?.nameAr || "").trim();
    const unit = String(body?.unit || "").trim();
    const reorderLevel = Number(body?.reorderLevel || 0);
    const openingQuantity = Number(
      body?.openingQuantity || 0,
    );

    if (!sku || !nameAr || !unit) {
      return NextResponse.json(
        {
          error:
            "كود الصنف والاسم والوحدة بيانات مطلوبة",
        },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(reorderLevel) ||
      reorderLevel < 0 ||
      !Number.isFinite(openingQuantity) ||
      openingQuantity < 0
    ) {
      return NextResponse.json(
        { error: "الأرصدة يجب أن تكون أرقامًا صحيحة" },
        { status: 400 },
      );
    }

    const item = await prisma.$transaction(
      async (tx) => {
        const created = await tx.inventoryItem.create({
          data: {
            sku,
            nameAr,
            unit,
            reorderLevel,
            quantity: openingQuantity,
            active: true,
          },
        });

        if (openingQuantity > 0) {
          await tx.inventoryMovement.create({
            data: {
              itemId: created.id,
              type: "ADJUSTMENT",
              quantity: openingQuantity,
              note: buildInventoryNote(
                "COMPANY_OPENING",
                `رصيد افتتاحي بواسطة ${actor.name}`,
              ),
            },
          });
        }

        return created;
      },
      { isolationLevel: "Serializable" },
    );

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "INVENTORY_ITEM_CREATED",
        newValue: {
          itemId: item.id,
          sku: item.sku,
          nameAr: item.nameAr,
          unit: item.unit,
          reorderLevel: Number(item.reorderLevel),
          openingQuantity: Number(item.quantity),
        },
      },
    });

    return NextResponse.json(
      { id: item.id },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "كود الصنف مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error.message || "تعذر إضافة الصنف",
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
