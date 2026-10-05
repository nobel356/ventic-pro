import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

function clean(value: unknown) {
  return String(value || "").trim();
}

function validDate(value: unknown) {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function GET() {
  try {
    await requirePermission(PERMISSIONS.PROMOTIONS_MANAGE);

    const [coupons, services] = await Promise.all([
      prisma.coupon.findMany({
        orderBy: { createdAt: "desc" },
      }),
      prisma.service.findMany({
        where: { active: true },
        select: {
          code: true,
          nameAr: true,
        },
        orderBy: { nameAr: "asc" },
      }),
    ]);

    return NextResponse.json({
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        name: coupon.name || "",
        description: coupon.description || "",
        type: coupon.type,
        value: Number(coupon.value),
        minOrder:
          coupon.minOrder == null
            ? null
            : Number(coupon.minOrder),
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        maxUses: coupon.maxUses,
        usedCount: coupon.usedCount,
        eligibleServiceCodes: coupon.eligibleServiceCodes,
        active: coupon.active,
      })),
      services,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر تحميل العروض" },
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
    const actor = await requirePermission(
      PERMISSIONS.PROMOTIONS_MANAGE,
    );
    const body = await req.json();
    const id = clean(body?.id);
    const code = clean(body?.code).toUpperCase();
    const name = clean(body?.name) || null;
    const description = clean(body?.description) || null;
    const type = String(body?.type || "FIXED");
    const value = Number(body?.value || 0);
    const minOrder =
      body?.minOrder === "" || body?.minOrder == null
        ? null
        : Math.max(0, Number(body.minOrder));
    const startsAt = validDate(body?.startsAt);
    const endsAt = validDate(body?.endsAt);
    const maxUses =
      body?.maxUses === "" || body?.maxUses == null
        ? null
        : Math.max(1, Math.floor(Number(body.maxUses)));
    const active = body?.active !== false;
    const eligibleServiceCodes: string[] = Array.isArray(
      body?.eligibleServiceCodes,
    )
      ? Array.from(
          new Set(
            body.eligibleServiceCodes
              .map((item: unknown) => clean(item).toUpperCase())
              .filter((value: string) => Boolean(value)),
          ),
        )
      : [];

    if (!code || !["FIXED", "PERCENT"].includes(type)) {
      return NextResponse.json(
        { error: "الكود ونوع الخصم مطلوبان" },
        { status: 400 },
      );
    }

    if (
      !Number.isFinite(value) ||
      value <= 0 ||
      (type === "PERCENT" && value > 100)
    ) {
      return NextResponse.json(
        { error: "قيمة الخصم غير صحيحة" },
        { status: 400 },
      );
    }

    if (startsAt && endsAt && endsAt <= startsAt) {
      return NextResponse.json(
        { error: "تاريخ النهاية يجب أن يكون بعد البداية" },
        { status: 400 },
      );
    }

    const old = id
      ? await prisma.coupon.findUnique({
          where: { id },
        })
      : null;

    const saved = id
      ? await prisma.coupon.update({
          where: { id },
          data: {
            code,
            name,
            description,
            type: type as any,
            value,
            minOrder,
            startsAt,
            endsAt,
            maxUses,
            eligibleServiceCodes,
            active,
          },
        })
      : await prisma.coupon.create({
          data: {
            code,
            name,
            description,
            type: type as any,
            value,
            minOrder,
            startsAt,
            endsAt,
            maxUses,
            eligibleServiceCodes,
            active,
          },
        });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: id ? "COUPON_UPDATED" : "COUPON_CREATED",
        oldValue: old
          ? {
              id: old.id,
              code: old.code,
              type: old.type,
              value: Number(old.value),
              minOrder:
                old.minOrder == null
                  ? null
                  : Number(old.minOrder),
              active: old.active,
              maxUses: old.maxUses,
              eligibleServiceCodes: old.eligibleServiceCodes,
            }
          : undefined,
        newValue: {
          id: saved.id,
          code: saved.code,
          type: saved.type,
          value: Number(saved.value),
          minOrder:
            saved.minOrder == null
              ? null
              : Number(saved.minOrder),
          active: saved.active,
          maxUses: saved.maxUses,
          eligibleServiceCodes: saved.eligibleServiceCodes,
        },
      },
    });

    return NextResponse.json({ ok: true, id: saved.id });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "كود الخصم مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error?.message || "تعذر حفظ العرض" },
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
