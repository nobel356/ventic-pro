import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  authContext,
  authCookies,
  can,
  createImpersonationToken,
  PERMISSIONS,
  requireBasePermission,
} from "@/lib/auth-v7";

const roleLabels: Record<
  string,
  string
> = {
  SUPER_ADMIN:
    "مدير النظام",
  ADMIN: "مدير",
  CUSTOMER_SERVICE:
    "خدمة العملاء",
  TECHNICIAN: "فني",
};

export async function GET() {
  try {
    const actor =
      await requireBasePermission(
        PERMISSIONS.USERS_IMPERSONATE,
      );

    const users =
      await prisma.user.findMany({
        where: {
          active: true,
          ...(actor.role ===
          "SUPER_ADMIN"
            ? {}
            : {
                role: {
                  not:
                    "SUPER_ADMIN",
                },
              }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
        orderBy: [
          { role: "asc" },
          { name: "asc" },
        ],
      });

    return NextResponse.json({
      users: users.map(
        (user) => ({
          ...user,
          roleLabel:
            roleLabels[
              user.role
            ] || user.role,
        }),
      ),
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تحميل المستخدمين",
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

export async function POST(
  req: Request,
) {
  try {
    const actor =
      await requireBasePermission(
        PERMISSIONS.USERS_IMPERSONATE,
      );
    const body =
      await req.json();
    const targetUserId =
      String(
        body?.targetUserId ||
          "",
      );

    const target =
      await prisma.user.findUnique({
        where: {
          id: targetUserId,
        },
      });

    if (
      !target ||
      !target.active
    ) {
      return NextResponse.json(
        {
          error:
            "المستخدم غير متاح",
        },
        { status: 404 },
      );
    }

    if (
      target.role ===
        "SUPER_ADMIN" &&
      actor.role !==
        "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error:
            "غير مسموح بالتبديل إلى مدير النظام",
        },
        { status: 403 },
      );
    }

    if (
      target.id === actor.id
    ) {
      const response =
        NextResponse.json({
          ok: true,
          restored: true,
        });

      response.cookies.set(
        authCookies.impersonation,
        "",
        {
          httpOnly: true,
          secure:
            process.env.NODE_ENV ===
            "production",
          sameSite: "lax",
          path: "/",
          maxAge: 0,
        },
      );

      return response;
    }

    const token =
      createImpersonationToken(
        target.id,
      );

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel:
          actor.name,
        action:
          "USER_IMPERSONATION_STARTED",
        newValue: {
          targetUserId:
            target.id,
          targetName:
            target.name,
          targetRole:
            target.role,
        },
      },
    });

    const response =
      NextResponse.json({
        ok: true,
        user: {
          id: target.id,
          name: target.name,
          role: target.role,
        },
      });

    response.cookies.set(
      authCookies.impersonation,
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge:
          8 * 60 * 60,
      },
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر تبديل المستخدم",
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

export async function DELETE() {
  try {
    const context =
      await authContext();

    if (!context.baseUser) {
      return NextResponse.json(
        {
          error:
            "UNAUTHENTICATED",
        },
        { status: 401 },
      );
    }

    if (
      context.impersonating
    ) {
      await prisma.auditLog.create({
        data: {
          actorId:
            context.baseUser.id,
          actorLabel:
            context.baseUser.name,
          action:
            "USER_IMPERSONATION_STOPPED",
          newValue: {
            targetUserId:
              context.user?.id,
            targetName:
              context.user?.name,
          },
        },
      });
    }

    const response =
      NextResponse.json({
        ok: true,
      });

    response.cookies.set(
      authCookies.impersonation,
      "",
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      },
    );

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          "تعذر الرجوع للحساب الأصلي",
      },
      { status: 500 },
    );
  }
}
