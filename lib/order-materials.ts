import {
  parseInventoryNote,
  signedTechnicianDelta,
} from "@/lib/inventory";

export async function technicianItemBalance(
  client: any,
  itemId: string,
  technicianId: string,
) {
  const movements = await client.inventoryMovement.findMany({
    where: { itemId, technicianId },
    select: { type: true, quantity: true, note: true },
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

export async function getOrderMaterialState(
  client: any,
  orderId: string,
  technicianId?: string | null,
) {
  const movements = await client.inventoryMovement.findMany({
    where: {
      orderId,
      ...(technicianId ? { technicianId } : {}),
    },
    include: {
      item: {
        select: { id: true, sku: true, nameAr: true, unit: true },
      },
      technician: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const usedMovements = movements.filter((movement: any) => {
    const parsed = parseInventoryNote(movement.note);
    return movement.type === "OUT" && parsed.marker === "TECH_OUT";
  });

  const noneConfirmation = await client.auditLog.findFirst({
    where: {
      orderId,
      action: "ORDER_MATERIALS_CONFIRMED_NONE",
      ...(technicianId ? { actorId: technicianId } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    movements,
    usedMovements,
    confirmed: usedMovements.length > 0 || Boolean(noneConfirmation),
    confirmedNone: usedMovements.length === 0 && Boolean(noneConfirmation),
  };
}
