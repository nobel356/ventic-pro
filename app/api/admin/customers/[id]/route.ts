import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
} from "@/lib/auth-v7";
import { hashPassword } from "@/lib/password";
import {
  normalizeCustomerPhone,
  validEgyptMobile,
} from "@/lib/customer-auth";
import { maskPhone } from "@/lib/customer-messaging";

export async function PATCH(
  req: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  try {
    const actor =
      await requirePermission(
        PERMISSIONS.CUSTOMER_ACCOUNTS_EDIT,
      );
    const { id } = await params;
    const body = await req.json();

    const old =
      await prisma.customer.findUnique({
        where: { id },
      });

    if (!old) {
      return NextResponse.json(
        {
          error:
            "العميل غير موجود",
        },
        { status: 404 },
      );
    }

    const name = String(
      body?.name ?? old.name,
    ).trim();
    const phone =
      normalizeCustomerPhone(
        body?.phone ?? old.phone,
      );
    const active =
      body?.active === undefined
        ? old.active
        : Boolean(body.active);
    const password = String(
      body?.password || "",
    );

    if (
      !name ||
      !validEgyptMobile(phone)
    ) {
      return NextResponse.json(
        {
          error:
            "الاسم ورقم موبايل مصري صحيح مطلوبان",
        },
        { status: 400 },
      );
    }

    if (
      password &&
      password.length < 6
    ) {
      return NextResponse.json(
        {
          error:
            "كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف",
        },
        { status: 400 },
      );
    }

    const passwordChanged =
      Boolean(password);
    const sensitiveChanged =
      passwordChanged ||
      phone !== old.phone ||
      active !== old.active;

    const customer =
      await prisma.$transaction(
        async (tx) => {
          const updated =
            await tx.customer.update({
              where: { id },
              data: {
                name,
                phone,
                active,
                ...(passwordChanged
                  ? {
                      passwordHash:
                        hashPassword(
                          password,
                        ),
                    }
                  : {}),
              },
            });

          if (sensitiveChanged) {
            await tx.customerSession.deleteMany({
              where: {
                customerId: id,
              },
            });
          }

          if (passwordChanged) {
            await tx.customerPasswordReset.updateMany({
              where: {
                customerId: id,
                usedAt: null,
              },
              data: {
                usedAt:
                  new Date(),
              },
            });
          }

          await tx.auditLog.create({
            data: {
              actorId: actor.id,
              actorLabel:
                actor.name,
              action:
                "CUSTOMER_ACCOUNT_UPDATED",
              oldValue: {
                customerId: id,
                name: old.name,
                phoneMasked:
                  maskPhone(
                    old.phone,
                  ),
                active:
                  old.active,
                hasAccount:
                  Boolean(
                    old.passwordHash,
                  ),
              },
              newValue: {
                customerId: id,
                name:
                  updated.name,
                phoneMasked:
                  maskPhone(
                    updated.phone,
                  ),
                active:
                  updated.active,
                hasAccount:
                  Boolean(
                    updated.passwordHash,
                  ),
                passwordChanged,
                sessionsRevoked:
                  sensitiveChanged,
              },
            },
          });

          return updated;
        },
        {
          isolationLevel:
            "Serializable",
        },
      );

    return NextResponse.json({
      ok: true,
      customer: {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        active:
          customer.active,
        hasAccount: Boolean(
          customer.passwordHash,
        ),
      },
    });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        {
          error:
            "رقم الموبايل مستخدم لعميل آخر",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تعديل حساب العميل",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : error?.message ===
                "FORBIDDEN"
              ? 403
              : 500,
      },
    );
  }
}
