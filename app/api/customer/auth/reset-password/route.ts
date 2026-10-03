import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import {
  normalizeCustomerPhone,
  validEgyptMobile,
} from "@/lib/customer-auth";
import {
  customerResetCodeMatches,
} from "@/lib/customer-password-reset";
import { maskPhone } from "@/lib/customer-messaging";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const phone = normalizeCustomerPhone(body?.phone);
    const code = String(body?.code || "")
      .replace(/\D/g, "")
      .slice(0, 6);
    const password = String(
      body?.password || "",
    );

    if (
      !validEgyptMobile(phone) ||
      code.length !== 6
    ) {
      return NextResponse.json(
        { error: "رقم الموبايل أو الكود غير صحيح" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف",
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
      !customer.passwordHash
    ) {
      return NextResponse.json(
        {
          error:
            "الكود غير صحيح أو منتهي",
        },
        { status: 400 },
      );
    }

    const reset =
      await prisma.customerPasswordReset.findFirst({
        where: {
          customerId: customer.id,
          usedAt: null,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (
      !reset ||
      reset.expiresAt < new Date() ||
      reset.attempts >= 5
    ) {
      return NextResponse.json(
        {
          error:
            "الكود غير صحيح أو منتهي",
        },
        { status: 400 },
      );
    }

    const matches =
      customerResetCodeMatches(
        customer.id,
        code,
        reset.codeHash,
      );

    if (!matches) {
      await prisma.customerPasswordReset.update({
        where: { id: reset.id },
        data: {
          attempts: {
            increment: 1,
          },
        },
      });

      return NextResponse.json(
        {
          error:
            "الكود غير صحيح أو منتهي",
        },
        { status: 400 },
      );
    }

    const now = new Date();
    const passwordHash =
      hashPassword(password);

    await prisma.$transaction(
      async (tx) => {
        await tx.customer.update({
          where: {
            id: customer.id,
          },
          data: {
            passwordHash,
          },
        });

        await tx.customerSession.deleteMany({
          where: {
            customerId: customer.id,
          },
        });

        await tx.customerPasswordReset.updateMany({
          where: {
            customerId: customer.id,
            usedAt: null,
          },
          data: {
            usedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            actorLabel: `العميل: ${customer.name}`,
            action:
              "CUSTOMER_PASSWORD_RESET_COMPLETED",
            newValue: {
              customerId:
                customer.id,
              phoneMasked:
                maskPhone(
                  customer.phone,
                ),
              sessionsRevoked: true,
            },
          },
        });
      },
      {
        isolationLevel: "Serializable",
      },
    );

    return NextResponse.json({
      ok: true,
      message:
        "تم تغيير كلمة المرور. يمكنك تسجيل الدخول بكلمة المرور الجديدة.",
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تغيير كلمة المرور",
      },
      { status: 500 },
    );
  }
}
