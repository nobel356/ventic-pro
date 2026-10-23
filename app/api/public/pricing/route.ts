import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const services = await prisma.service.findMany({
      where: {
        active: true,
        customerVisible: true,
      },
      select: {
        code: true,
        nameAr: true,
        pricingType: true,
        priceFrom: true,
        priceTo: true,
      },
      orderBy: { nameAr: "asc" },
    });

    return NextResponse.json({
      services: services.map((item) => ({
        code: item.code,
        nameAr: item.nameAr,
        pricingType: item.pricingType,
        priceFrom: Number(item.priceFrom),
        priceTo: item.priceTo === null ? null : Number(item.priceTo),
      })),
    });
  } catch {
    return NextResponse.json(
      { services: [], error: "PRICING_UNAVAILABLE" },
      { status: 500 },
    );
  }
}
