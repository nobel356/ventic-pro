import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";

const PRICING_TYPES = new Set([
  "FIXED",
  "PER_METER",
  "RANGE",
]);

function auditValue(service: any) {
  return {
    id: service.id,
    code: service.code,
    nameAr: service.nameAr,
    pricingType:
      service.pricingType,
    priceFrom:
      Number(service.priceFrom),
    priceTo:
      service.priceTo === null
        ? null
        : Number(service.priceTo),
    active: service.active,
    customerVisible:
      service.customerVisible,
  };
}

function authError(error: any) {
  const message = error?.message;

  if (
    message !== "UNAUTHENTICATED" &&
    message !== "FORBIDDEN"
  ) {
    return null;
  }

  return NextResponse.json(
    { error: message },
    {
      status:
        message === "UNAUTHENTICATED"
          ? 401
          : 403,
      headers: {
        "Cache-Control":
          "private, no-store, max-age=0",
      },
    },
  );
}

export async function GET() {
  try {
    await requirePermission(
      PERMISSIONS.PRICE_EDIT,
    );

    const services =
      await prisma.service.findMany({
        orderBy: {
          nameAr: "asc",
        },
      });

    return NextResponse.json(
      services,
      {
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    const auth = authError(error);
    if (auth) return auth;

    console.error(
      "ADMIN_PRICING_LIST_FAILED",
      error,
    );

    return NextResponse.json(
      {
        error:
          "تعذر تحميل الأسعار",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
) {
  try {
    const actor =
      await requirePermission(
        PERMISSIONS.PRICE_EDIT,
      );

    let body: any;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "بيانات الطلب غير صالحة",
        },
        { status: 400 },
      );
    }

    const code = String(
      body?.code || "",
    )
      .trim()
      .toUpperCase();
    const nameAr = String(
      body?.nameAr || "",
    ).trim();
    const pricingType = String(
      body?.pricingType ||
        "FIXED",
    )
      .trim()
      .toUpperCase();

    if (
      !/^[A-Z0-9_-]{2,64}$/.test(
        code,
      ) ||
      !nameAr ||
      nameAr.length > 160 ||
      !PRICING_TYPES.has(
        pricingType,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "بيانات الخدمة غير صالحة",
        },
        { status: 400 },
      );
    }

    const fromRaw =
      body?.priceFrom;
    const hasFrom =
      fromRaw !== null &&
      fromRaw !== undefined &&
      String(fromRaw).trim() !== "";
    const priceFrom =
      hasFrom
        ? Number(fromRaw)
        : Number.NaN;

    const toRaw =
      body?.priceTo;
    const hasTo =
      toRaw !== null &&
      toRaw !== undefined &&
      String(toRaw).trim() !== "";
    const priceTo =
      hasTo
        ? Number(toRaw)
        : null;

    if (
      !Number.isFinite(
        priceFrom,
      ) ||
      priceFrom < 0 ||
      (priceTo !== null &&
        (!Number.isFinite(
          priceTo,
        ) ||
          priceTo < priceFrom))
    ) {
      return NextResponse.json(
        {
          error:
            "قيمة السعر غير صالحة",
        },
        { status: 400 },
      );
    }

    const existing =
      await prisma.service.findUnique({
        where: { code },
      });

    const service =
      await prisma.$transaction(
        async (tx) => {
          const saved =
            await tx.service.upsert({
              where: { code },
              update: {
                nameAr,
                pricingType,
                priceFrom,
                priceTo,
                active:
                  body?.active !==
                  false,
                customerVisible:
                  body?.customerVisible !==
                  false,
              },
              create: {
                code,
                nameAr,
                pricingType,
                priceFrom,
                priceTo,
                active:
                  body?.active !==
                  false,
                customerVisible:
                  body?.customerVisible !==
                  false,
              },
            });

          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              actorLabel:
                actor.name,
              action: existing
                ? "SERVICE_PRICING_UPDATED"
                : "SERVICE_PRICING_CREATED",
              oldValue: existing
                ? auditValue(
                    existing,
                  )
                : undefined,
              newValue:
                auditValue(saved),
            },
          });

          return saved;
        },
      );

    return NextResponse.json(
      service,
      {
        status: existing
          ? 200
          : 201,
        headers: {
          "Cache-Control":
            "private, no-store, max-age=0",
        },
      },
    );
  } catch (error: any) {
    const auth = authError(error);
    if (auth) return auth;

    console.error(
      "ADMIN_PRICING_SAVE_FAILED",
      error,
    );

    return NextResponse.json(
      {
        error:
          "تعذر حفظ السعر",
      },
      { status: 500 },
    );
  }
}
