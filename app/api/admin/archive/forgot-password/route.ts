import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  archiveActorFor,
  getVaultSetting,
  logArchiveEvent,
} from "@/lib/archive-vault";
import { rawPrisma } from "@/lib/prisma";
import { sendBrandedEmail } from "@/lib/branded-email";
import {
  clientIp,
  rateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const RECOVERY_EMAIL =
  (
    process.env
      .ARCHIVE_RECOVERY_EMAIL ||
    "MOHAMEDNABIL356@GMAIL.COM"
  )
    .trim()
    .toLowerCase();

function hashToken(
  token: string,
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function maskedEmail() {
  const [
    local,
    domain,
  ] =
    RECOVERY_EMAIL.split("@");

  return `${local?.slice(0, 1) || "*"}***@${domain || "***"}`;
}

export async function POST(
  req: Request,
) {
  try {
    const actor =
      await archiveActorFor();

    if (!actor) {
      return NextResponse.json(
        {
          error:
            "UNAUTHENTICATED",
        },
        { status: 401 },
      );
    }

    if (
      actor.role !==
      "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "استعادة كلمة سر الأرشيف متاحة لـ Super Admin فقط.",
        },
        { status: 403 },
      );
    }

    const limited =
      rateLimit(
        `archive-reset:${actor.id}:${clientIp(req)}`,
        {
          limit: 3,
          windowMs:
            60 * 60 * 1000,
        },
      );

    if (!limited.allowed) {
      return NextResponse.json(
        {
          error:
            "تم إرسال عدد كبير من طلبات الاستعادة. حاول لاحقًا.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(
              limited,
            ),
        },
      );
    }

    const setting =
      await getVaultSetting();

    if (!setting) {
      return NextResponse.json(
        {
          error:
            "Archive Vault غير مهيأ بعد.",
        },
        { status: 404 },
      );
    }

    const token =
      crypto
        .randomBytes(32)
        .toString(
          "base64url",
        );

    const expiresAt =
      new Date(
        Date.now() +
          20 * 60 * 1000,
      );

    await rawPrisma.archiveVaultSetting.update({
      where: {
        id: "primary",
      },
      data: {
        resetTokenHash:
          hashToken(token),
        resetTokenExpiresAt:
          expiresAt,
        resetRequestedAt:
          new Date(),
      },
    });

    const configured =
      String(
        process.env
          .NEXT_PUBLIC_APP_URL ||
          "",
      )
        .trim()
        .replace(/\/+$/, "");

    const origin =
      configured ||
      new URL(req.url).origin;

    const resetUrl =
      `${origin}/admin/archive/reset?token=${encodeURIComponent(token)}`;

    const result =
      await sendBrandedEmail({
        email:
          RECOVERY_EMAIL,
        subject:
          "استعادة كلمة سر Archive Vault",
        message:
          `تم طلب إعادة تعيين كلمة سر Archive Vault في Ventic Pro.\n\n` +
          `افتح الرابط التالي خلال 20 دقيقة:\n${resetUrl}\n\n` +
          `إذا لم تطلب ذلك، تجاهل الرسالة. يجب أيضًا أن تكون مسجلًا بحساب Super Admin لإتمام التغيير.`,
      });

    if (!result.sent) {
      await rawPrisma.archiveVaultSetting.update({
        where: {
          id: "primary",
        },
        data: {
          resetTokenHash:
            null,
          resetTokenExpiresAt:
            null,
          resetRequestedAt:
            null,
        },
      });

      return NextResponse.json(
        {
          error:
            result.error ||
            "تعذر إرسال رسالة الاستعادة.",
        },
        { status: 502 },
      );
    }

    await logArchiveEvent(
      actor,
      "ARCHIVE_VAULT_PASSWORD_RESET_REQUESTED",
      {
        newValue: {
          destination:
            maskedEmail(),
          expiresAt:
            expiresAt.toISOString(),
        },
      },
    );

    return NextResponse.json({
      ok: true,
      destination:
        maskedEmail(),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر إرسال رابط الاستعادة.",
      },
      { status: 500 },
    );
  }
}
