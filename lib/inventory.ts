import type { InventoryMovementType } from "@prisma/client";

export const COMPANY_LOCATION = "COMPANY";

export type InventoryMarker =
  | "COMPANY_IN"
  | "COMPANY_OUT"
  | "COMPANY_TO_TECH"
  | "TECH_TO_COMPANY"
  | "TECH_OUT"
  | "COMPANY_ADJUST"
  | "TECH_ADJUST"
  | "COMPANY_OPENING"
  | "LEGACY";

const PREFIX = "VPINV";

export function buildInventoryNote(
  marker: InventoryMarker,
  note?: string | null,
) {
  const clean = String(note || "")
    .replace(/\s+/g, " ")
    .trim();

  return clean ? `${PREFIX}|${marker}|${clean}` : `${PREFIX}|${marker}`;
}

export function parseInventoryNote(note?: string | null) {
  const value = String(note || "");

  if (!value.startsWith(`${PREFIX}|`)) {
    return {
      marker: "LEGACY" as InventoryMarker,
      note: value,
    };
  }

  const [, marker = "LEGACY", ...rest] = value.split("|");

  return {
    marker: marker as InventoryMarker,
    note: rest.join("|").trim(),
  };
}

export function signedTechnicianDelta(input: {
  type: InventoryMovementType;
  quantity: unknown;
  note?: string | null;
}) {
  const quantity = Number(input.quantity || 0);
  const { marker } = parseInventoryNote(input.note);

  if (input.type === "TRANSFER") {
    if (marker === "COMPANY_TO_TECH") return quantity;
    if (marker === "TECH_TO_COMPANY") return -quantity;
  }

  if (input.type === "OUT" && marker === "TECH_OUT") {
    return -quantity;
  }

  if (input.type === "ADJUSTMENT" && marker === "TECH_ADJUST") {
    return quantity;
  }

  return 0;
}

export function movementLabel(
  type: InventoryMovementType,
  note?: string | null,
) {
  const { marker } = parseInventoryNote(note);

  const labels: Record<string, string> = {
    COMPANY_IN: "وارد إلى مخزن الشركة",
    COMPANY_OUT: "صرف من مخزن الشركة",
    COMPANY_TO_TECH: "تحويل من الشركة إلى فني",
    TECH_TO_COMPANY: "مرتجع من فني إلى الشركة",
    TECH_OUT: "استهلاك من مخزون فني",
    COMPANY_ADJUST: "تسوية مخزن الشركة",
    TECH_ADJUST: "تسوية مخزون فني",
    COMPANY_OPENING: "رصيد افتتاحي",
    LEGACY: "حركة قديمة",
  };

  return labels[marker] || type;
}
