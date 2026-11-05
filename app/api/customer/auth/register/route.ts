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
import { getRuntimeControl } from "@/lib/runtime-control";

export async function POST(req: Request) {
  try {
    const {
      control,
    } = await getRuntimeControl();

    if (
      !control.customerAccounts ||
      !control.accountRegistration
    ) {
      return NextResponse.json(
        {
          code:
            "ACCOUNT_REGISTRATION_DISABLED",
          error:
            "إنشاء حسابات جديدة متوقف مؤقتًا. يمكنك تسجيل اسمك ورقمك وسيقوم فريق Ventic Pro بالتواصل معك.",
        },
        { status: 503 },
      );
    }

    if (!control.phoneOtp) {
      return NextResponse.json(
        {
          code:
            "PHONE_VERIFICATION_REQUIRED",
          error:
            "تفعيل الحسابات الجديدة متوقف لحين تشغيل التحقق على رقم الموبايل.",
        },
        { status: 503 },
      );
    }

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

    if (
      customer &&
      (
        !customer.active ||
        Boolean(
          customer.archivedAt,
        )
      )
    ) {
      return NextResponse.json(
        {
          error:
            "هذا الحساب غير نشط. تواصل مع Ventic Pro للمراجعة.",
        },
        { status: 403 },
      );
    }

    // V20I4: an existing Customer may already own private orders,
    // addresses, invoices and warranties. Never attach the first
    // password without OTP verification of the registered phone.
    if (
      customer &&
      !customer.passwordHash
    ) {
      return NextResponse.json(
        {
          code:
            "ACCOUNT_ACTIVATION_REQUIRED",
          error:
            "رقم الموبايل مرتبط بطلب سابق. استخدم «نسيت كلمة المرور» لاستلام كود التحقق وتفعيل الحساب.",
        },
        { status: 409 },
      );
    }

    if (customer?.passwordHash) {
      return NextResponse.json(
        {
          code:
            "ACCOUNT_ALREADY_EXISTS",
          error:
            "يوجد حساب بالفعل بهذا الرقم. استخدم تسجيل الدخول.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        code:
          "DIRECT_REGISTRATION_BLOCKED",
        error:
          "تفعيل الحساب الجديد يتطلب كود تحقق على رقم الموبايل. استخدم مسار التفعيل بعد ربط مزود الرسائل.",
      },
      { status: 409 },
    );
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
