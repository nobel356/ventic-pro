import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  normalizeCustomerPhone,
  validEgyptMobile,
} from "@/lib/customer-auth";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";
import { notifyCustomer } from "@/lib/customer-notifications";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(
      `customer-register:${clientIp(req)}`,
      {
        limit: 5,
        windowMs: 60 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        {
          error:
            "تم تجاوز عدد محاولات إنشاء الحساب. حاول لاحقًا.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(limited),
        },
      );
    }

    const body = await req.json();
    const name = String(
      body?.name || "",
    ).trim();
    const phone =
      normalizeCustomerPhone(
        body?.phone,
      );
    const email = String(
      body?.email || "",
    )
      .trim()
      .toLowerCase();
    const password = String(
      body?.password || "",
    );
    const legalAccepted =
      body?.legalAccepted === true;

    if (
      !name ||
      !validEgyptMobile(phone) ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !legalAccepted
    ) {
      return NextResponse.json(
        {
          error:
            "اكتب الاسم ورقم موبايل مصري وبريدًا إلكترونيًا صحيحًا ووافق على الشروط",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور يجب ألا تقل عن 6 أحرف",
        },
        { status: 400 },
      );
    }

    let customer =
      await prisma.customer.findUnique({
        where: { phone },
      });

    if (customer?.passwordHash) {
      return NextResponse.json(
        {
          error:
            "يوجد حساب بالفعل بهذا الرقم. استخدم تسجيل الدخول.",
        },
        { status: 409 },
      );
    }

    const passwordHash =
      hashPassword(password);

    if (customer) {
      customer =
        await prisma.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            name,
            email,
            passwordHash,
            active: true,
          },
        });
    } else {
      customer =
        await prisma.customer.create({
          data: {
            name,
            phone,
            email,
            passwordHash,
            active: true,
          },
        });
    }

    const session =
      await createCustomerSession(
        customer.id,
      );

    await prisma.auditLog.create({
      data: {
        actorLabel: `العميل: ${customer.name}`,
        action:
          "CUSTOMER_ACCOUNT_CREATED",
        newValue: {
          customerId:
            customer.id,
          phoneMasked: `${phone.slice(
            0,
            3,
          )}******${phone.slice(-2)}`,
        },
      },
    });

    await notifyCustomer({
      customerId: customer.id,
      phone: customer.phone,
      email: customer.email,
      templateKey: "CUSTOMER_ACCOUNT_CREATED",
      subject: "تم إنشاء حسابك في Ventic Pro",
      message:
        `مرحبًا ${customer.name}\nتم إنشاء حسابك في Ventic Pro بنجاح. ` +
        "يمكنك من حسابك متابعة الطلبات والفواتير والضمان والصيانة والتقييمات.",
      payload: {
        accountCreated: true,
      },
    });

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
          "تعذر إنشاء حساب العميل",
      },
      { status: 500 },
    );
  }
}
