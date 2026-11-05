import { NextResponse } from "next/server";
import { getRuntimeControl } from "@/lib/runtime-control";
import { prisma } from "@/lib/prisma";
import { calculateOrderOffer } from "@/lib/promotions";
import {
  clientIp,
  durableRateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const fallbackPrices: Record<string, number> = {
  BATH_NEW: 350,
  BATH_REPLACE: 400,
  BATH_INSTALL_ONLY: 300,
  KITCHEN_FAN: 400,
  HOOD: 500,
  EXTERNAL_FAN: 500,
  DUCT_METER: 250,
};

export async function POST(req: Request) {
  const {
    control,
  } = await getRuntimeControl();

  if (
    control.mode !== "NORMAL" ||
    !control.estimates
  ) {
    return NextResponse.json(
      {
        error:
          "التسعير التقديري متوقف مؤقتًا.",
      },
      { status: 503 },
    );
  }

  const limited =
    await durableRateLimit(
      `public-order-estimate:${clientIp(req)}`,
      {
        limit: 120,
        windowMs:
          15 * 60 * 1000,
      },
    );

  if (!limited.allowed) {
    return NextResponse.json(
      {
        error:
          "تم تجاوز عدد طلبات التسعير. حاول مرة أخرى بعد قليل.",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(limited),
      },
    );
  }

  try {
    const body = await req.json();
    const rawLines =
      Array.isArray(
        body?.serviceLines,
      )
        ? body.serviceLines.slice(
            0,
            50,
          )
        : [];

    const lines = rawLines
      .map((line: any) => ({
        code: String(
          line?.code || "",
        )
          .trim()
          .toUpperCase()
          .slice(0, 64),
        qty: Math.min(
          1000,
          Math.max(
            0,
            Number(
              line?.qty || 0,
            ),
          ),
        ),
      }))
      .filter(
        (line: { code: string; qty: number }) =>
          line.code && Number.isFinite(line.qty) && line.qty > 0,
      );

    const submittedSubtotal =
      Number(
        body?.subtotal || 0,
      );
    let subtotal =
      Number.isFinite(
        submittedSubtotal,
      )
        ? Math.min(
            10_000_000,
            Math.max(
              0,
              submittedSubtotal,
            ),
          )
        : 0;
    let serviceCodes: string[] =
      Array.isArray(
        body?.serviceCodes,
      )
        ? body.serviceCodes
            .slice(0, 50)
            .map(
              (
                value: unknown,
              ) =>
                String(
                  value || "",
                )
                  .trim()
                  .toUpperCase()
                  .slice(0, 64),
            )
            .filter(Boolean)
        : [];

    if (lines.length > 0) {
      serviceCodes = lines.map((line: { code: string }) => line.code);

      const configured = await prisma.service.findMany({
        where: {
          active: true,
          code: { in: serviceCodes },
        },
        select: {
          code: true,
          priceFrom: true,
        },
      });

      const prices = new Map(
        configured.map((service) => [
          service.code,
          Number(service.priceFrom),
        ]),
      );

      subtotal = lines.reduce(
        (
          sum: number,
          line: { code: string; qty: number },
        ) =>
          sum +
          line.qty *
            (prices.get(line.code) ??
              fallbackPrices[line.code] ??
              0),
        0,
      );
    }

    const result = await calculateOrderOffer(prisma, {
      governorate: String(
        body?.governorate || "",
      ).slice(0, 120),
      area: String(
        body?.area || "",
      ).slice(0, 120),
      couponCode: String(
        body?.couponCode || "",
      ).slice(0, 64),
      subtotal,
      serviceCodes,
    });

    return NextResponse.json({
      subtotal,
      travelFee: result.travelFee,
      areaServed: result.serviceArea
        ? result.serviceArea.active
        : null,
      serviceDays:
        result.serviceArea?.serviceDays || null,
      coupon: result.coupon
        ? {
            code: result.coupon.code,
            name: result.coupon.name,
          }
        : null,
      couponValid: result.couponValid,
      couponReason: result.couponReason,
      discount: result.discount,
      total: result.total,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر حساب العرض" },
      { status: 500 },
    );
  }
}
