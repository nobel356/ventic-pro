import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth-v7";

export async function POST(req: Request) {
  try {
    await requirePermission("orders.edit");
    const {
      itemId,
      type,
      quantity,
      orderId,
      technicianId,
      note,
    } = await req.json();

    const q = Number(quantity);

    if (!itemId || q <= 0) {
      return NextResponse.json(
        { error: "كمية غير صحيحة" },
        { status: 400 },
      );
    }

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: itemId,
        active: true,
        archivedAt: null,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "الصنف غير موجود أو مؤرشف" },
        { status: 404 },
      );
    }

    const delta = type === "OUT" ? -q : q;

    if (Number(item.quantity) + delta < 0) {
      return NextResponse.json(
        { error: "الرصيد غير كافٍ" },
        { status: 409 },
      );
    }

    const result = await prisma.$transaction([
      prisma.inventoryMovement.create({
        data: {
          itemId,
          type,
          quantity: q,
          orderId,
          technicianId,
          note,
        },
      }),
      prisma.inventoryItem.update({
        where: { id: itemId },
        data: {
          quantity: {
            increment: delta,
          },
        },
      }),
    ]);

    return NextResponse.json(result[0]);
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message },
      { status: 403 },
    );
  }
}
