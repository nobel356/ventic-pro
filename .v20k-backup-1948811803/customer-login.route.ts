import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  normalizeCustomerPhone,
  validEgyptMobile,
} from "@/lib/customer-auth";
import {
  clearRateLimit,
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone =
      normalizeCustomerPhone(
        body?.phone,
      );
    const password = String(
      body?.password || "",
    );
    const key = `customer-login:${clientIp(req)}:${phone || "empty"}`;
    const limited = rateLimit(key, {
      limit: 8,
      windowMs: 15 * 60 * 1000,
    });

    if (!limited.allowed) {
      return NextResponse.json(
        {
          error:
            "تم تجاوز عدد محاولات الدخول. حاول مرة أخرى بعد قليل.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(limited),
        },
      );
    }

    if (
      !validEgyptMobile(phone) ||
      !password
    ) {
      return NextResponse.json(
        {
          error:
            "رقم الموبايل وكلمة المرور مطلوبان",
        },
        { status: 400 },
      );
    }

    const customer =
      await prisma.customer.findUnique({
        where: { phone },
      });

    if (
      !customer ||
      !customer.active ||
      !customer.passwordHash ||
      !verifyPassword(
        password,
        customer.passwordHash,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "رقم الموبايل أو كلمة المرور غير صحيحة",
        },
        { status: 401 },
      );
    }

    clearRateLimit(key);

    const session =
      await createCustomerSession(
        customer.id,
      );

    const response =
      NextResponse.json({
        ok: true,
        customer: {
          id: customer.id,
          name: customer.name,
        },
      });

    response.cookies.set(
      CUSTOMER_SESSION_COOKIE,
      session.raw,
      {
        httpOnly: true,
        sameSite: "lax",
        secure:
          process.env.NODE_ENV ===
          "production",
        path: "/",
        maxAge:
          60 * 60 * 24 * 30,
      },
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تسجيل الدخول",
      },
      { status: 500 },
    );
  }
}
