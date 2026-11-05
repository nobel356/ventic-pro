import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateOrderOffer } from "@/lib/promotions";

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
  try {
    const body = await req.json();
    const rawLines = Array.isArray(body?.serviceLines)
      ? body.serviceLines
      : [];

    const lines = rawLines
      .map((line: any) => ({
        code: String(line?.code || "").trim().toUpperCase(),
        qty: Math.max(0, Number(line?.qty || 0)),
      }))
      .filter(
        (line: { code: string; qty: number }) =>
          line.code && Number.isFinite(line.qty) && line.qty > 0,
      );

    let subtotal = Math.max(0, Number(body?.subtotal || 0));
    let serviceCodes: string[] = Array.isArray(body?.serviceCodes)
      ? body.serviceCodes.map((value: unknown) =>
          String(value || "").trim().toUpperCase(),
        )
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
      governorate: body?.governorate,
      area: body?.area,
      couponCode: body?.couponCode,
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
