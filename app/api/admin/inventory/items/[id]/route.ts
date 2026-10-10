import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requirePermission(
      PERMISSIONS.INVENTORY_EDIT,
    );
    const { id } = await params;
    const body = await req.json();

    const old = await prisma.inventoryItem.findFirst({
      where: {
        id,
        archivedAt: null,
      },
    });

    if (!old) {
      return NextResponse.json(
        { error: "الصنف غير موجود" },
        { status: 404 },
      );
    }

    const sku = String(body?.sku ?? old.sku)
      .trim()
      .toUpperCase();
    const nameAr = String(
      body?.nameAr ?? old.nameAr,
    ).trim();
    const unit = String(body?.unit ?? old.unit).trim();
    const reorderLevel =
      body?.reorderLevel === undefined
        ? Number(old.reorderLevel)
        : Number(body.reorderLevel);
    const active =
      body?.active === undefined
        ? old.active
        : Boolean(body.active);

    if (!sku || !nameAr || !unit) {
      return NextResponse.json(
        { error: "بيانات الصنف غير مكتملة" },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(reorderLevel) ||
      reorderLevel < 0
    ) {
      return NextResponse.json(
        { error: "حد إعادة الطلب غير صالح" },
        { status: 400 },
      );
    }

    const item = await prisma.inventoryItem.update({
      where: { id },
      data: {
        sku,
        nameAr,
        unit,
        reorderLevel,
        active,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "INVENTORY_ITEM_UPDATED",
        oldValue: {
          itemId: old.id,
          sku: old.sku,
          nameAr: old.nameAr,
          unit: old.unit,
          reorderLevel: Number(old.reorderLevel),
          active: old.active,
          quantity: Number(old.quantity),
        },
        newValue: {
          itemId: item.id,
          sku: item.sku,
          nameAr: item.nameAr,
          unit: item.unit,
          reorderLevel: Number(item.reorderLevel),
          active: item.active,
          quantity: Number(item.quantity),
        },
      },
    });

    return NextResponse.json({ ok: true });
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
          error.message || "تعذر تعديل الصنف",
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
