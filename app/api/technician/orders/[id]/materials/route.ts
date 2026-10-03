import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { currentTechnician } from "@/lib/technician";
import { buildInventoryNote, parseInventoryNote } from "@/lib/inventory";
import {
  getOrderMaterialState,
  technicianItemBalance,
} from "@/lib/order-materials";

async function assignedOrder(id: string, technicianId: string) {
  return prisma.order.findFirst({
    where: {
      id,
      technicianId,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    include: {
      customer: { select: { name: true } },
    },
  });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tech = await currentTechnician();
  if (!tech) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const order = await assignedOrder(id, tech.id);
  if (!order) {
    return NextResponse.json({ error: "الطلب غير مسند لهذا الفني" }, { status: 403 });
  }

  const [items, state] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: { active: true },
      orderBy: { nameAr: "asc" },
    }),
    getOrderMaterialState(prisma, id, tech.id),
  ]);

  const balances = await Promise.all(
    items.map(async (item) => ({
      id: item.id,
      sku: item.sku,
      nameAr: item.nameAr,
      unit: item.unit,
      balance: await technicianItemBalance(prisma, item.id, tech.id),
    })),
  );

  return NextResponse.json({
    order: {
      id: order.id,
      orderNo: order.orderNo,
      customerName: order.customer.name,
      status: order.status,
    },
    items: balances.filter((item) => item.balance > 0),
    usage: state.usedMovements.map((movement: any) => {
      const parsed = parseInventoryNote(movement.note);
      return {
        id: movement.id,
        itemName: movement.item.nameAr,
        sku: movement.item.sku,
        unit: movement.item.unit,
        quantity: Number(movement.quantity),
        note: parsed.note,
        createdAt: movement.createdAt,
      };
    }),
    confirmed: state.confirmed,
    confirmedNone: state.confirmedNone,
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tech = await currentTechnician();
  if (!tech) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });

  const { id } = await params;
  const order = await assignedOrder(id, tech.id);
  if (!order) {
    return NextResponse.json({ error: "الطلب غير مسند لهذا الفني" }, { status: 403 });
  }

  const body = await req.json();

  if (body?.confirmNone === true) {
    const state = await getOrderMaterialState(prisma, id, tech.id);
    if (state.usedMovements.length > 0) {
      return NextResponse.json(
        { error: "تم تسجيل خامات مستخدمة بالفعل لهذا الطلب" },
        { status: 409 },
      );
    }

    const existing = await prisma.auditLog.findFirst({
      where: {
        orderId: id,
        actorId: tech.id,
        action: "ORDER_MATERIALS_CONFIRMED_NONE",
      },
    });

    if (!existing) {
      await prisma.auditLog.create({
        data: {
          orderId: id,
          actorId: tech.id,
          actorLabel: tech.name,
          action: "ORDER_MATERIALS_CONFIRMED_NONE",
          newValue: { confirmedAt: new Date().toISOString() },
        },
      });
    }

    return NextResponse.json({ ok: true, confirmedNone: true });
  }

  const itemId = String(body?.itemId || "");
  const quantity = Number(body?.quantity || 0);
  const note = String(body?.note || "").trim();

  if (!itemId || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json(
      { error: "اختر الصنف وأدخل كمية صحيحة" },
      { status: 400 },
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.inventoryItem.findFirst({
          where: { id: itemId, active: true },
        });
        if (!item) throw new Error("ITEM_NOT_FOUND");

        const balance = await technicianItemBalance(tx, itemId, tech.id);
        if (balance < quantity) throw new Error("INSUFFICIENT_TECH");

        const movement = await tx.inventoryMovement.create({
          data: {
            itemId,
            technicianId: tech.id,
            orderId: id,
            type: "OUT",
            quantity,
            note: buildInventoryNote(
              "TECH_OUT",
              note || `استخدام في الطلب ${order.orderNo}`,
            ),
          },
        });

        await tx.auditLog.create({
          data: {
            orderId: id,
            actorId: tech.id,
            actorLabel: tech.name,
            action: "ORDER_MATERIAL_USED",
            newValue: {
              movementId: movement.id,
              itemId: item.id,
              sku: item.sku,
              itemName: item.nameAr,
              quantity,
              unit: item.unit,
              technicianBalanceBefore: balance,
              technicianBalanceAfter: balance - quantity,
              note: note || null,
            },
          },
        });

        return { movementId: movement.id, balanceAfter: balance - quantity };
      },
      { isolationLevel: "Serializable" },
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    if (error?.message === "ITEM_NOT_FOUND") {
      return NextResponse.json({ error: "الصنف غير موجود أو موقوف" }, { status: 404 });
    }
    if (error?.message === "INSUFFICIENT_TECH") {
      return NextResponse.json(
        { error: "عهدة الفني لا تكفي. اطلب تحويل الخامة من مخزن الشركة أولًا." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: error?.message || "تعذر تسجيل الخامة المستخدمة" },
      { status: 500 },
    );
  }
}
