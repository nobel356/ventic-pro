import { NotificationChannel } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  normalizeCustomerPhone,
  validEgyptMobile,
} from "@/lib/customer-auth";
import {
  deliverCustomerPasswordResetOtp,
  maskPhone,
  passwordResetStagingVisible,
} from "@/lib/customer-messaging";
import {
  hashCustomerResetCode,
  newCustomerResetCode,
} from "@/lib/customer-password-reset";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const GENERIC_MESSAGE =
  "إذا كان الرقم مرتبطًا بحساب Ventic Pro فسيصلك كود استعادة كلمة المرور.";

export async function POST(req: Request) {
  try {
    const limited = rateLimit(
      `password-forgot:${clientIp(req)}`,
      {
        limit: 8,
        windowMs: 15 * 60 * 1000,
      },
    );

    if (!limited.allowed) {
      return NextResponse.json(
        {
          ok: true,
          message: GENERIC_MESSAGE,
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(limited),
        },
      );
    }

    const body = await req.json();
    const phone =
      normalizeCustomerPhone(
        body?.phone,
      );

    if (!validEgyptMobile(phone)) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_MESSAGE,
      });
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
      return NextResponse.json({
        ok: true,
        message: GENERIC_MESSAGE,
      });
    }

    const recent =
      await prisma.customerPasswordReset.findFirst({
        where: {
          customerId:
            customer.id,
          usedAt: null,
          createdAt: {
            gte: new Date(
              Date.now() - 60_000,
            ),
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });

    if (recent) {
      return NextResponse.json({
        ok: true,
        message: GENERIC_MESSAGE,
        retryAfterSeconds:
          Math.max(
            1,
            60 -
              Math.floor(
                (Date.now() -
                  recent.createdAt.getTime()) /
                  1000,
              ),
          ),
      });
    }

    const otp =
      newCustomerResetCode();
    const expiresAt = new Date(
      Date.now() +
        10 * 60_000,
    );

    const reset =
      await prisma.customerPasswordReset.create({
        data: {
          customerId:
            customer.id,
          codeHash:
            hashCustomerResetCode(
              customer.id,
              otp,
            ),
          expiresAt,
        },
      });

    const delivery =
      await deliverCustomerPasswordResetOtp({
        phone: customer.phone,
        email: customer.email,
        otp,
      });

    const channel: NotificationChannel =
      delivery.channel ===
      "WHATSAPP"
        ? "WHATSAPP"
        : delivery.channel ===
            "SMS"
          ? "SMS"
          : "IN_APP";

    await prisma.notification.create({
      data: {
        customerId:
          customer.id,
        channel,
        templateKey:
          "CUSTOMER_PASSWORD_RESET",
        destinationMasked:
          delivery.destinationMasked,
        payload: {
          resetId: reset.id,
          expiresAt:
            expiresAt.toISOString(),
          provider:
            delivery.provider,
          staging:
            passwordResetStagingVisible(),
        },
        status:
          delivery.sent
            ? "SENT"
            : "FAILED",
        error:
          delivery.sent
            ? null
            : delivery.error ||
              "MESSAGING_DISABLED",
        sentAt:
          delivery.sent
            ? new Date()
            : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorLabel: "النظام",
        action:
          "CUSTOMER_PASSWORD_RESET_REQUESTED",
        newValue: {
          customerId:
            customer.id,
          phoneMasked:
            maskPhone(
              customer.phone,
            ),
          resetId: reset.id,
          expiresAt:
            expiresAt.toISOString(),
          deliverySent:
            delivery.sent,
          deliveryChannel:
            delivery.channel,
        },
      },
    });

    const safeStagingVisible =
      process.env.VERCEL_ENV !==
        "production" &&
      String(
        process.env
          .PASSWORD_RESET_STAGING_VISIBLE ||
          "false",
      ).toLowerCase() === "true";

    return NextResponse.json({
      ok: true,
      message: GENERIC_MESSAGE,
      expiresInMinutes: 10,
      retryAfterSeconds: 60,
      stagingOtp:
        safeStagingVisible
          ? otp
          : undefined,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر بدء استعادة كلمة المرور",
      },
      { status: 500 },
    );
  }
}
