export const MARKETING_SPEND_RECORDED =
  "MARKETING_SPEND_RECORDED";
export const MARKETING_SPEND_VOIDED =
  "MARKETING_SPEND_VOIDED";

export type MarketingSpendRecord = {
  id: string;
  source: string;
  campaign: string;
  amount: number;
  spentAt: Date;
  note: string;
  actorLabel: string;
  createdAt: Date;
};

type AuditLike = {
  id: string;
  action: string;
  actorLabel: string;
  newValue: unknown;
  createdAt: Date;
};

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

  return value as Record<
    string,
    unknown
  >;
}

function clean(
  value: unknown,
) {
  return String(value || "")
    .trim();
}

export function materializeMarketingSpends(
  logs: AuditLike[],
) {
  const voided =
    new Set<string>();

  for (const log of logs) {
    if (
      log.action !==
      MARKETING_SPEND_VOIDED
    ) {
      continue;
    }

    const value =
      record(log.newValue);
    const spendAuditId =
      clean(
        value.spendAuditId,
      );

    if (spendAuditId) {
      voided.add(
        spendAuditId,
      );
    }
  }

  const result: MarketingSpendRecord[] =
    [];

  for (const log of logs) {
    if (
      log.action !==
        MARKETING_SPEND_RECORDED ||
      voided.has(log.id)
    ) {
      continue;
    }

    const value =
      record(log.newValue);
    const source =
      clean(value.source);
    const campaign =
      clean(value.campaign);
    const note =
      clean(value.note);
    const amount =
      Number(value.amount || 0);
    const spentAt =
      new Date(
        clean(value.spentAt),
      );

    if (
      !source ||
      !Number.isFinite(
        amount,
      ) ||
      amount <= 0 ||
      Number.isNaN(
        spentAt.getTime(),
      )
    ) {
      continue;
    }

    result.push({
      id: log.id,
      source,
      campaign,
      amount,
      spentAt,
      note,
      actorLabel:
        log.actorLabel,
      createdAt:
        log.createdAt,
    });
  }

  return result.sort(
    (a, b) =>
      b.spentAt.getTime() -
        a.spentAt.getTime() ||
      b.createdAt.getTime() -
        a.createdAt.getTime(),
  );
}
