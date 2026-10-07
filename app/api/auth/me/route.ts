import { NextResponse } from "next/server";
import {
  authContext,
  can,
  PERMISSIONS,
} from "@/lib/auth-v7";

export async function GET() {
  const context =
    await authContext();

  if (!context.user) {
    return NextResponse.json(
      {
        error:
          "UNAUTHENTICATED",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    user: {
      id: context.user.id,
      name: context.user.name,
      login: context.user.email,
      role: context.user.role,
    },
    session: {
      impersonating:
        context.impersonating,
      canSwitch:
        Boolean(
          context.baseUser &&
            can(
              context.baseUser.role,
              PERMISSIONS.USERS_IMPERSONATE,
              context.baseUser.permissions,
            ),
        ),
      originalUser:
        context.impersonating &&
        context.baseUser
          ? {
              id:
                context.baseUser.id,
              name:
                context.baseUser.name,
              login:
                context.baseUser.email,
              role:
                context.baseUser.role,
            }
          : null,
    },
  });
}
