import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  buildInventoryNote,
  signedTechnicianDelta,
} from "@/lib/inventory";

type MovementAction =
  | "COMPANY_IN"
  | "COMPANY_OUT"
  | "COMPANY_TO_TECH"
  | "TECH_TO_COMPANY"
  | "TECH_OUT"
  | "COMPANY_ADJUST"
  | "TECH_ADJUST";

async function technicianStock(
  client: any,
  itemId: string,
  technicianId: string,
) {
  const movements = await client.inventoryMovement.findMany({
    where: {
      itemId,
      technicianId,
    },
    select: {
      type: true,
      quantity: true,
      note: true,
    },
  });

  return movements.reduce(
    (sum: number, movement: any) =>
      sum +
      signedTechnicianDelta({
        type: movement.type,
        quantity: movement.quantity,
        note: movement.note,
      }),
    0,
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const action = String(
      body?.action || "",
    ) as MovementAction;

    const adjustment =
      action === "COMPANY_ADJUST" ||
      action === "TECH_ADJUST";

    const actor = await requirePermission(
      adjustment
        ? PERMISSIONS.INVENTORY_ADJUST
        : PERMISSIONS.INVENTORY_MOVE,
    );

    const itemId = String(body?.itemId || "");
    const technicianId = body?.technicianId
      ? String(body.technicianId)
      : null;
    const orderId = body?.orderId
      ? String(body.orderId)
      : null;
    const note = String(body?.note || "").trim();

    const quantity = Number(body?.quantity || 0);
    const targetQuantity = Number(
      body?.targetQuantity ?? NaN,
    );

    const allowed = new Set<MovementAction>([
      "COMPANY_IN",
      "COMPANY_OUT",
      "COMPANY_TO_TECH",
      "TECH_TO_COMPANY",
      "TECH_OUT",
      "COMPANY_ADJUST",
      "TECH_ADJUST",
    ]);

    if (!allowed.has(action)) {
      return NextResponse.json(
        { error: "نوع الحركة غير صالح" },
        { status: 400 },
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { error: "اختر الصنف" },
        { status: 400 },
      );
    }

    if (
      !adjustment &&
      (!Number.isFinite(quantity) || quantity <= 0)
    ) {
      return NextResponse.json(
        { error: "الكمية يجب أن تكون أكبر من صفر" },
        { status: 400 },
      );
    }

    if (
      adjustment &&
      (!Number.isFinite(targetQuantity) ||
        targetQuantity < 0)
    ) {
      return NextResponse.json(
        { error: "الرصيد الفعلي غير صالح" },
        { status: 400 },
      );
    }

    const needsTechnician = [
      "COMPANY_TO_TECH",
      "TECH_TO_COMPANY",
      "TECH_OUT",
      "TECH_ADJUST",
    ].includes(action);

    if (needsTechnician && !technicianId) {
      return NextResponse.json(
        { error: "اختر الفني" },
        { status: 400 },
      );
    }

    if (technicianId) {
      const tech = await prisma.user.findFirst({
        where: {
          id: technicianId,
          role: "TECHNICIAN",
          active: true,
        },
        select: { id: true },
      });

      if (!tech) {
        return NextResponse.json(
          { error: "الفني غير موجود أو غير نشط" },
          { status: 404 },
        );
      }
    }

    if (orderId) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true },
      });

      if (!order) {
        return NextResponse.json(
          { error: "الطلب غير موجود" },
          { status: 404 },
        );
      }
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const item = await tx.inventoryItem.findUnique({
          where: { id: itemId },
        });

        if (!item) {
          throw new Error("ITEM_NOT_FOUND");
        }

        const companyBefore = Number(item.quantity);
        const techBefore = technicianId
          ? await technicianStock(
              tx,
              itemId,
              technicianId,
            )
          : 0;

        let companyAfter = companyBefore;
        let techAfter = techBefore;
        let storedQuantity = quantity;
        let movementType:
          | "IN"
          | "OUT"
          | "TRANSFER"
          | "ADJUSTMENT" = "ADJUSTMENT";

        if (action === "COMPANY_IN") {
          movementType = "IN";
          companyAfter = companyBefore + quantity;
        }

        if (action === "COMPANY_OUT") {
          movementType = "OUT";
          if (companyBefore < quantity) {
            throw new Error("INSUFFICIENT_COMPANY");
          }
          companyAfter = companyBefore - quantity;
        }

        if (action === "COMPANY_TO_TECH") {
          movementType = "TRANSFER";
          if (companyBefore < quantity) {
            throw new Error("INSUFFICIENT_COMPANY");
          }
          companyAfter = companyBefore - quantity;
          techAfter = techBefore + quantity;
        }

        if (action === "TECH_TO_COMPANY") {
          movementType = "TRANSFER";
          if (techBefore < quantity) {
            throw new Error("INSUFFICIENT_TECH");
          }
          companyAfter = companyBefore + quantity;
          techAfter = techBefore - quantity;
        }

        if (action === "TECH_OUT") {
          movementType = "OUT";
          if (techBefore < quantity) {
            throw new Error("INSUFFICIENT_TECH");
          }
          techAfter = techBefore - quantity;
        }

        if (action === "COMPANY_ADJUST") {
          movementType = "ADJUSTMENT";
          storedQuantity =
            targetQuantity - companyBefore;

          if (Math.abs(storedQuantity) < 0.000001) {
            throw new Error("NO_CHANGE");
          }

          companyAfter = targetQuantity;
        }

        if (action === "TECH_ADJUST") {
          movementType = "ADJUSTMENT";
          storedQuantity =
            targetQuantity - techBefore;

          if (Math.abs(storedQuantity) < 0.000001) {
            throw new Error("NO_CHANGE");
          }

          techAfter = targetQuantity;
        }

        if (
          action !== "TECH_OUT" &&
          action !== "TECH_ADJUST" &&
          action !== "TECH_TO_COMPANY"
        ) {
          if (companyAfter !== companyBefore) {
            await tx.inventoryItem.update({
              where: { id: itemId },
              data: {
                quantity: companyAfter,
              },
            });
          }
        } else if (
          action === "TECH_TO_COMPANY" &&
          companyAfter !== companyBefore
        ) {
          await tx.inventoryItem.update({
            where: { id: itemId },
            data: {
              quantity: companyAfter,
            },
          });
        }

        const movement =
          await tx.inventoryMovement.create({
            data: {
              itemId,
              type: movementType,
              quantity: storedQuantity,
              technicianId,
              orderId,
              note: buildInventoryNote(
                action,
                note ||
                  `بواسطة ${actor.name}`,
              ),
            },
          });

        return {
          movement,
          item,
          companyBefore,
          companyAfter,
          techBefore,
          techAfter,
        };
      },
      { isolationLevel: "Serializable" },
    );

    await prisma.auditLog.create({
      data: {
        orderId: orderId || undefined,
        actorId: actor.id,
        actorLabel: actor.name,
        action: "INVENTORY_MOVEMENT_CREATED",
        oldValue: {
          itemId,
          companyQuantity: result.companyBefore,
          technicianId,
          technicianQuantity: result.techBefore,
        },
        newValue: {
          movementId: result.movement.id,
          movementAction: action,
          movementQuantity: Number(
            result.movement.quantity,
          ),
          companyQuantity: result.companyAfter,
          technicianId,
          technicianQuantity: result.techAfter,
          orderId,
          note,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      id: result.movement.id,
    });
  } catch (error: any) {
    const message = String(error?.message || "");

    if (message === "ITEM_NOT_FOUND") {
      return NextResponse.json(
        { error: "الصنف غير موجود" },
        { status: 404 },
      );
    }

    if (message === "INSUFFICIENT_COMPANY") {
      return NextResponse.json(
        {
          error:
            "رصيد مخزن الشركة لا يكفي لتنفيذ الحركة",
        },
        { status: 409 },
      );
    }

    if (message === "INSUFFICIENT_TECH") {
      return NextResponse.json(
        {
          error:
            "رصيد الفني لا يكفي لتنفيذ الحركة",
        },
        { status: 409 },
      );
    }

    if (message === "NO_CHANGE") {
      return NextResponse.json(
        {
          error:
            "الرصيد الفعلي يساوي الرصيد المسجل ولا توجد تسوية مطلوبة",
        },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        error:
          message || "تعذر تسجيل حركة المخزون",
      },
      {
        status:
          message === "UNAUTHENTICATED"
            ? 401
            : message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
