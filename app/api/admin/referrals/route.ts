import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import {
  loadReferralCodes,
  REFERRAL_CODE_SAVED,
  REFERRAL_REWARD_SETTLED,
} from "@/lib/referrals";

function clean(value: unknown, max = 160) {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.PROMOTIONS_MANAGE);
    return NextResponse.json(await loadReferralCodes(prisma));
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.PROMOTIONS_MANAGE);
    const body = await req.json();

    if (body?.operation === "settle_reward") {
      const id = clean(body?.id, 80);
      const current = await loadReferralCodes(prisma);
      const item = current.find((candidate) => candidate.id === id);

      if (!item) {
        return NextResponse.json({ error: "كود الإحالة غير موجود." }, { status: 404 });
      }

      if (item.uses <= item.rewardedUses) {
        return NextResponse.json({ ok: true, settled: false });
      }

      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorLabel: actor.name,
          action: REFERRAL_REWARD_SETTLED,
          newValue: {
            referralId: item.id,
            code: item.code,
            throughUses: item.uses,
            benefitLabel: item.benefitLabel,
          },
        },
      });

      return NextResponse.json({ ok: true, settled: true, throughUses: item.uses });
    }

    const code = clean(body?.code, 24).toUpperCase();
    const id = clean(body?.id, 80) || crypto.randomUUID();
    const ownerName = clean(body?.ownerName, 120);
    const ownerPhone = clean(body?.ownerPhone, 30) || null;
    const benefitLabel = clean(body?.benefitLabel, 200) || null;
    const discountType =
      body?.discountType === "PERCENT" ? "PERCENT" : "FIXED";
    const discountValue = Math.max(0, Number(body?.discountValue) || 0);
    const maxUsesRaw = Number(body?.maxUses);
    const maxUses =
      Number.isFinite(maxUsesRaw) && maxUsesRaw > 0
        ? Math.floor(maxUsesRaw)
        : null;
    const active = body?.active !== false;

    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) {
      return NextResponse.json(
        { error: "الكود يجب أن يكون 3-24 حرف/رقم إنجليزي بدون مسافات." },
        { status: 400 },
      );
    }

    if (!ownerName) {
      return NextResponse.json(
        { error: "اسم صاحب كود الإحالة مطلوب." },
        { status: 400 },
      );
    }

    if (discountType === "PERCENT" && discountValue > 100) {
      return NextResponse.json(
        { error: "نسبة الخصم لا يمكن أن تتجاوز 100%." },
        { status: 400 },
      );
    }

    const current = await loadReferralCodes(prisma);
    const duplicate = current.find(
      (item) => item.code === code && item.id !== id,
    );

    if (duplicate) {
      return NextResponse.json(
        { error: "كود الإحالة مستخدم بالفعل." },
        { status: 409 },
      );
    }

    const previous = current.find((item) => item.id === id);

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: REFERRAL_CODE_SAVED,
        oldValue: previous || undefined,
        newValue: {
          id,
          code,
          ownerName,
          ownerPhone,
          benefitLabel,
          discountType,
          discountValue,
          maxUses,
          active,
          createdAt: previous?.createdAt || new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({ ok: true, id, code });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "FAILED" },
      {
        status:
          error?.message === "UNAUTHENTICATED"
            ? 401
            : error?.message === "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
