export const ORDER_COST_RECORDED =
  "ORDER_COST_RECORDED";
export const ORDER_COST_VOIDED =
  "ORDER_COST_VOIDED";

export type OrderCostCategory =
  | "LABOR"
  | "TRANSPORT"
  | "OTHER";

export type OrderCostRecord = {
  id: string;
  orderId: string;
  category: OrderCostCategory;
  amount: number;
  occurredAt: Date;
  note: string;
  actorLabel: string;
  createdAt: Date;
};

type AuditLike = {
  id: string;
  orderId?: string | null;
  action: string;
  actorLabel: string;
  newValue: unknown;
  createdAt: Date;
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function record(
  value: unknown,
): Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    return {};
  }

  return value as Record<string, unknown>;
}

export function materializeOrderCosts(
  logs: AuditLike[],
) {
  const voided =
    new Set<string>();

  for (const log of logs) {
    if (
      log.action !==
      ORDER_COST_VOIDED
    ) {
      continue;
    }

    const value =
      record(log.newValue);
    const costAuditId =
      clean(value.costAuditId);

    if (costAuditId) {
      voided.add(costAuditId);
    }
  }

  const result: OrderCostRecord[] = [];

  for (const log of logs) {
    if (
      log.action !==
        ORDER_COST_RECORDED ||
      voided.has(log.id) ||
      !log.orderId
    ) {
      continue;
    }

    const value =
      record(log.newValue);
    const category =
      clean(value.category) as
        OrderCostCategory;
    const amount =
      Number(value.amount || 0);
    const occurredAt =
      new Date(
        clean(value.occurredAt),
      );

    if (
      ![
        "LABOR",
        "TRANSPORT",
        "OTHER",
      ].includes(category) ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      Number.isNaN(
        occurredAt.getTime(),
      )
    ) {
      continue;
    }

    result.push({
      id: log.id,
      orderId: log.orderId,
      category,
      amount,
      occurredAt,
      note:
        clean(value.note),
      actorLabel:
        log.actorLabel,
      createdAt:
        log.createdAt,
    });
  }

  return result.sort(
    (a, b) =>
      b.occurredAt.getTime() -
        a.occurredAt.getTime() ||
      b.createdAt.getTime() -
        a.createdAt.getTime(),
  );
}

export function orderCostCategoryLabel(
  category: OrderCostCategory,
) {
  const labels: Record<
    OrderCostCategory,
    string
  > = {
    LABOR: "أجر / تكلفة تنفيذ",
    TRANSPORT: "انتقال",
    OTHER: "تكلفة أخرى",
  };

  return labels[category];
}
