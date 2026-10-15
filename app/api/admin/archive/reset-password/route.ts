import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  ARCHIVE_VAULT_COOKIE,
  archiveActorFor,
  createVaultToken,
  logArchiveEvent,
} from "@/lib/archive-vault";
import { hashPassword } from "@/lib/password";
import { rawPrisma } from "@/lib/prisma";

function hashToken(
  token: string,
) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function safeEqual(
  left: string,
  right: string,
) {
  try {
    const a =
      Buffer.from(left);
    const b =
      Buffer.from(right);

    return (
      a.length === b.length &&
      crypto.timingSafeEqual(
        a,
        b,
      )
    );
  } catch {
    return false;
  }
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
            "سجل الدخول بحساب Super Admin أولًا.",
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

    const body =
      await req.json();
    const token =
      String(
        body?.token || "",
      ).trim();
    const password =
      String(
        body?.password || "",
      );

    if (
      !token ||
      password.length < 10
    ) {
      return NextResponse.json(
        {
          error:
            "الرابط غير صحيح أو كلمة السر الجديدة أقل من 10 أحرف.",
        },
        { status: 400 },
      );
    }

    const setting =
      await rawPrisma.archiveVaultSetting.findUnique({
        where: {
          id: "primary",
        },
      });

    if (
      !setting ||
      !setting.resetTokenHash ||
      !setting.resetTokenExpiresAt ||
      setting.resetTokenExpiresAt.getTime() <
        Date.now() ||
      !safeEqual(
        hashToken(token),
        setting.resetTokenHash,
      )
    ) {
      return NextResponse.json(
        {
          error:
            "رابط الاستعادة غير صالح أو انتهت مدته.",
        },
        { status: 400 },
      );
    }

    const nextVersion =
      setting.version + 1;

    await rawPrisma.archiveVaultSetting.update({
      where: {
        id: "primary",
      },
      data: {
        passwordHash:
          hashPassword(
            password,
          ),
        version:
          nextVersion,
        updatedById:
          actor.id,
        updatedByLabel:
          actor.name,
        resetTokenHash:
          null,
        resetTokenExpiresAt:
          null,
        resetRequestedAt:
          null,
      },
    });

    await logArchiveEvent(
      actor,
      "ARCHIVE_VAULT_PASSWORD_RESET",
    );

    const vaultToken =
      createVaultToken(
        actor.id,
        nextVersion,
      );

    const response =
      NextResponse.json({
        ok: true,
        unlocked: true,
      });

    response.cookies.set(
      ARCHIVE_VAULT_COOKIE,
      vaultToken.value,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(
          vaultToken.expiresAt,
        ),
      },
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر إعادة تعيين كلمة السر.",
      },
      { status: 500 },
    );
  }
}
