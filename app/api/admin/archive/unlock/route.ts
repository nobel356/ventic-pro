import { NextResponse } from "next/server";
import {
  ARCHIVE_VAULT_COOKIE,
  createVaultToken,
  getVaultSetting,
  logArchiveEvent,
  requireArchiveActor,
} from "@/lib/archive-vault";
import {
  PERMISSIONS,
} from "@/lib/permission-config";
import {
  verifyPassword,
} from "@/lib/password";
import {
  clientIp,
  clearDurableRateLimit,
  durableRateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

export async function POST(
  req: Request,
) {
  try {
    const actor =
      await requireArchiveActor(
        PERMISSIONS.ARCHIVE_VIEW,
      );
    const setting =
      await getVaultSetting();

    if (!setting) {
      return NextResponse.json(
        {
          error:
            "لم يتم إعداد كلمة سر الأرشيف بعد.",
        },
        { status: 409 },
      );
    }

    const ip =
      clientIp(req);
    const key =
      `archive-unlock:${actor.id}:${ip}`;
    const limit =
      await durableRateLimit(
        key,
        {
          limit: 5,
          windowMs:
            15 * 60 * 1000,
        },
      );

    if (!limit.allowed) {
      await logArchiveEvent(
        actor,
        "ARCHIVE_VAULT_UNLOCK_RATE_LIMITED",
        {
          newValue: {
            ip,
          },
        },
      );

      return NextResponse.json(
        {
          error:
            "محاولات كثيرة. حاول مرة أخرى لاحقًا.",
        },
        {
          status: 429,
          headers:
            rateLimitHeaders(
              limit,
            ),
        },
      );
    }

    const body =
      await req.json();
    const password =
      String(
        body?.password || "",
      );

    if (
      !verifyPassword(
        password,
        setting.passwordHash,
      )
    ) {
      await logArchiveEvent(
        actor,
        "ARCHIVE_VAULT_UNLOCK_FAILED",
        {
          newValue: {
            ip,
          },
        },
      );

      return NextResponse.json(
        {
          error:
            "كلمة سر الأرشيف غير صحيحة.",
        },
        { status: 401 },
      );
    }

    await clearDurableRateLimit(
      key,
    );

    const token =
      createVaultToken(
        actor.id,
        setting.version,
      );

    const response =
      NextResponse.json({
        ok: true,
        expiresAt:
          token.expiresAt,
      });

    response.cookies.set(
      ARCHIVE_VAULT_COOKIE,
      token.value,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "strict",
        path: "/",
        expires: new Date(
          token.expiresAt,
        ),
      },
    );

    await logArchiveEvent(
      actor,
      "ARCHIVE_VAULT_UNLOCKED",
      {
        newValue: {
          expiresAt:
            new Date(
              token.expiresAt,
            ).toISOString(),
        },
      },
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر فتح الأرشيف.",
      },
      {
        status:
          error?.message ===
          "UNAUTHENTICATED"
            ? 401
            : 403,
      },
    );
  }
}
