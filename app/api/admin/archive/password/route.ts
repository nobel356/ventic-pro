import { NextResponse } from "next/server";
import {
  ARCHIVE_VAULT_COOKIE,
  createVaultToken,
  getVaultSetting,
  isVaultUnlockedFor,
  logArchiveEvent,
  archiveActorFor,
} from "@/lib/archive-vault";
import {
  hashPassword,
} from "@/lib/password";
import {
  rawPrisma,
} from "@/lib/prisma";

export async function POST(
  req: Request,
) {
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
          "هذه العملية لمدير النظام فقط.",
      },
      { status: 403 },
    );
  }

  const body =
    await req.json();
  const password =
    String(
      body?.password || "",
    );

  if (password.length < 10) {
    return NextResponse.json(
      {
        error:
          "كلمة سر الأرشيف يجب ألا تقل عن 10 أحرف.",
      },
      { status: 400 },
    );
  }

  const existing =
    await getVaultSetting();

  if (
    existing &&
    !(await isVaultUnlockedFor(
      actor.id,
    ))
  ) {
    return NextResponse.json(
      {
        error:
          "افتح الأرشيف بكلمة السر الحالية قبل تغييرها.",
      },
      { status: 403 },
    );
  }

  const nextVersion =
    (existing?.version || 0) +
    1;

  await rawPrisma.archiveVaultSetting.upsert({
    where: {
      id: "primary",
    },
    create: {
      id: "primary",
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
    },
    update: {
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
    },
  });

  await logArchiveEvent(
    actor,
    existing
      ? "ARCHIVE_VAULT_PASSWORD_CHANGED"
      : "ARCHIVE_VAULT_PASSWORD_SET",
  );

  const token =
    createVaultToken(
      actor.id,
      nextVersion,
    );

  const response =
    NextResponse.json({
      ok: true,
      configured: true,
      unlocked: true,
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

  return response;
}
