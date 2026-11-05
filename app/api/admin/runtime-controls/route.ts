import { NextResponse } from "next/server";
import {
  currentUser,
} from "@/lib/auth-v7";
import {
  getRuntimeControl,
  sanitizeRuntimeControl,
  saveRuntimeControl,
} from "@/lib/runtime-control";
import { prisma } from "@/lib/prisma";

async function superAdmin() {
  const user = await currentUser();
  return user?.role === "SUPER_ADMIN"
    ? user
    : null;
}

export async function GET() {
  const user = await superAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  const result =
    await getRuntimeControl();

  return NextResponse.json(result);
}

export async function PATCH(
  req: Request,
) {
  const user = await superAdmin();

  if (!user) {
    return NextResponse.json(
      { error: "FORBIDDEN" },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const value =
      sanitizeRuntimeControl(
        body,
      );

    await saveRuntimeControl(
      value,
      {
        id: user.id,
        label: user.name,
      },
    );

    await prisma.auditLog.create({
      data: {
        actorId: user.id,
        actorLabel: user.name,
        action:
          "RUNTIME_CONTROL_UPDATED",
        newValue: value,
      },
    });

    return NextResponse.json({
      ok: true,
      control: value,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر حفظ إعدادات التشغيل",
      },
      { status: 500 },
    );
  }
}
