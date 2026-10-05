import { parseInventoryNote } from "@/lib/inventory";

export function technicianMovementDelta(movement: {
  type: string;
  quantity: unknown;
  note?: string | null;
}) {
  const quantity = Number(movement.quantity || 0);
  const { marker } = parseInventoryNote(movement.note);

  if (movement.type === "TRANSFER") {
    if (marker === "COMPANY_TO_TECH") return quantity;
    if (marker === "TECH_TO_COMPANY") return -quantity;
  }

  if (movement.type === "OUT" && marker === "TECH_OUT") {
    return -quantity;
  }

  if (movement.type === "ADJUSTMENT" && marker === "TECH_ADJUST") {
    return quantity;
  }

  return 0;
}

export async function technicianBalanceMap(client: any, technicianId?: string | null) {
  const movements = await client.inventoryMovement.findMany({
    where: technicianId ? { technicianId } : { technicianId: { not: null } },
    select: {
      itemId: true,
      technicianId: true,
      type: true,
      quantity: true,
      note: true,
    },
  });

  const balances = new Map<string, number>();

  for (const movement of movements) {
    if (!movement.technicianId) continue;
    const key = `${movement.technicianId}:${movement.itemId}`;
    balances.set(
      key,
      (balances.get(key) || 0) + technicianMovementDelta(movement),
    );
  }

  return balances;
}
