import { NextResponse } from "next/server";
import { getRuntimeControl } from "@/lib/runtime-control";
import { prisma } from "@/lib/prisma";
import {
  clientIp,
  durableRateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const MAX_SUBTOTAL = 10_000_000;

export async function POST(
  req: Request,
) {
  const {
    control,
  } = await getRuntimeControl();

  if (!control.coupons) {
    return NextResponse.json(
      {
        valid: false,
        discount: 0,
        disabled: true,
      },
      { status: 503 },
    );
  }

  const limited =
    await durableRateLimit(
      `coupon-validate:${clientIp(req)}`,
      {
        limit: 60,
        windowMs:
          15 * 60 * 1000,
      },
    );

  if (!limited.allowed) {
    return NextResponse.json(
      {
        valid: false,
        discount: 0,
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
    const code = String(
      body?.code || "",
    )
      .trim()
      .toUpperCase();
    const subtotal = Number(
      body?.subtotal,
    );

    if (
      !code ||
      code.length > 64 ||
      !Number.isFinite(subtotal) ||
      subtotal < 0 ||
      subtotal > MAX_SUBTOTAL
    ) {
      return NextResponse.json(
        {
          valid: false,
          discount: 0,
        },
        { status: 400 },
      );
    }

    const coupon =
      await prisma.coupon.findUnique({
        where: { code },
      });
    const now = new Date();

    if (
      !coupon ||
      !coupon.active ||
      (coupon.startsAt &&
        coupon.startsAt > now) ||
      (coupon.endsAt &&
        coupon.endsAt < now) ||
      (coupon.maxUses &&
        coupon.usedCount >=
          coupon.maxUses) ||
      subtotal <
        Number(
          coupon.minOrder || 0,
        )
    ) {
      return NextResponse.json({
        valid: false,
        discount: 0,
      });
    }

    const rawDiscount =
      coupon.type === "PERCENT"
        ? (subtotal *
            Number(coupon.value)) /
          100
        : Number(coupon.value);

    return NextResponse.json({
      valid: true,
      discount: Math.min(
        subtotal,
        Math.max(
          0,
          rawDiscount,
        ),
      ),
      code: coupon.code,
    });
  } catch {
    return NextResponse.json(
      {
        valid: false,
        discount: 0,
      },
      { status: 400 },
    );
  }
}
