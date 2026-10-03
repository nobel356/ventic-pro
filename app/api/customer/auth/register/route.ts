import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  createCustomerSession,
  CUSTOMER_SESSION_COOKIE,
  normalizeCustomerPhone,
  validEgyptMobile,
} from "@/lib/customer-auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = String(body?.name || "").trim();
    const phone = normalizeCustomerPhone(body?.phone);
    const password = String(body?.password || "");

    if (!name || !validEgyptMobile(phone)) {
      return NextResponse.json(
        { error: "اكتب الاسم ورقم موبايل مصري صحيح" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب ألا تقل عن 6 أحرف" },
        { status: 400 },
      );
    }

    let customer = await prisma.customer.findUnique({
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

    const passwordHash = hashPassword(password);

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name,
          passwordHash,
          active: true,
        },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          name,
          phone,
          passwordHash,
          active: true,
        },
      });
    }

    const session = await createCustomerSession(customer.id);

    await prisma.auditLog.create({
      data: {
        actorLabel: `العميل: ${customer.name}`,
        action: "CUSTOMER_ACCOUNT_CREATED",
        newValue: {
          customerId: customer.id,
          phoneMasked: `${phone.slice(0, 3)}******${phone.slice(-2)}`,
        },
      },
    });

    const response = NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
      },
    });

    response.cookies.set(CUSTOMER_SESSION_COOKIE, session.raw, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "تعذر إنشاء حساب العميل" },
      { status: 500 },
    );
  }
}
