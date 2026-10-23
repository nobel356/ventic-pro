export const REFERRAL_CODE_SAVED = "REFERRAL_CODE_SAVED";
export const REFERRAL_REDEEMED = "REFERRAL_REDEEMED";
export const REFERRAL_REWARD_SETTLED = "REFERRAL_REWARD_SETTLED";

export type ReferralCode = {
  id: string;
  code: string;
  ownerName: string;
  ownerPhone: string | null;
  benefitLabel: string | null;
  discountType: "FIXED" | "PERCENT";
  discountValue: number;
  maxUses: number | null;
  active: boolean;
  uses: number;
  rewardedUses: number;
  createdAt: string;
};

function clean(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

function objectValue(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function loadReferralCodes(db: any): Promise<ReferralCode[]> {
  const logs = await db.auditLog.findMany({
    where: {
      action: {
        in: [REFERRAL_CODE_SAVED, REFERRAL_REDEEMED, REFERRAL_REWARD_SETTLED],
      },
    },
    select: {
      action: true,
      newValue: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
    take: 10000,
  });

  const codes = new Map<string, ReferralCode>();
  const uses = new Map<string, number>();
  const rewardedUses = new Map<string, number>();

  for (const log of logs) {
    const value = objectValue(log.newValue);

    if (log.action === REFERRAL_CODE_SAVED) {
      const id = clean(value.id, 80);
      const code = clean(value.code, 32).toUpperCase();

      if (!id || !code) continue;

      const type = value.discountType === "PERCENT" ? "PERCENT" : "FIXED";
      const maxUsesRaw = Number(value.maxUses);

      codes.set(id, {
        id,
        code,
        ownerName: clean(value.ownerName, 120) || "بدون اسم",
        ownerPhone: clean(value.ownerPhone, 30) || null,
        benefitLabel: clean(value.benefitLabel, 200) || null,
        discountType: type,
        discountValue: Math.max(0, Number(value.discountValue) || 0),
        maxUses:
          Number.isFinite(maxUsesRaw) && maxUsesRaw > 0
            ? Math.floor(maxUsesRaw)
            : null,
        active: value.active !== false,
        uses: 0,
        rewardedUses: 0,
        createdAt:
          clean(value.createdAt, 60) || log.createdAt.toISOString(),
      });
    }

    if (log.action === REFERRAL_REDEEMED) {
      const code = clean(value.code, 32).toUpperCase();
      if (!code) continue;
      uses.set(code, (uses.get(code) || 0) + 1);
    }

    if (log.action === REFERRAL_REWARD_SETTLED) {
      const code = clean(value.code, 32).toUpperCase();
      const throughUses = Math.max(0, Math.floor(Number(value.throughUses) || 0));
      if (!code) continue;
      rewardedUses.set(code, Math.max(rewardedUses.get(code) || 0, throughUses));
    }
  }

  return [...codes.values()]
    .map((item) => ({
      ...item,
      uses: uses.get(item.code) || 0,
      rewardedUses: Math.min(
        uses.get(item.code) || 0,
        rewardedUses.get(item.code) || 0,
      ),
    }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function findActiveReferral(db: any, rawCode: string | null) {
  const code = clean(rawCode, 32).toUpperCase();
  if (!code) return null;

  const all = await loadReferralCodes(db);
  const item = all.find((candidate) => candidate.code === code) || null;

  if (!item || !item.active) return null;
  if (item.maxUses !== null && item.uses >= item.maxUses) return null;

  return item;
}

export function referralDiscountAmount(base: number, item: ReferralCode) {
  const safeBase = Math.max(0, Number(base) || 0);

  const raw =
    item.discountType === "PERCENT"
      ? safeBase * (Math.min(100, Math.max(0, item.discountValue)) / 100)
      : Math.max(0, item.discountValue);

  return Math.min(safeBase, Math.round(raw * 100) / 100);
}

export function referralCodeFromRequest(req: Request) {
  const cookie = req.headers.get("cookie") || "";

  for (const part of cookie.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name !== "ventic_referral") continue;

    try {
      return decodeURIComponent(rest.join("=")).trim().toUpperCase();
    } catch {
      return rest.join("=").trim().toUpperCase();
    }
  }

  return null;
}
