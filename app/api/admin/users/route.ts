import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import { hashPassword } from "@/lib/password";
import {
  CUSTOM_PERMISSIONS_MARKER,
  PERMISSION_OPTIONS,
} from "@/lib/permission-config";

const ALLOWED_ROLES = new Set([
  "SUPER_ADMIN",
  "ADMIN",
  "CUSTOMER_SERVICE",
  "TECHNICIAN",
]);
const ALLOWED_PERMISSIONS = new Set<string>(
  PERMISSION_OPTIONS.map((item) => item.value),
);

function safeUser(user: any) {
  return {
    id: user.id,
    name: user.name,
    login: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
    permissions: (user.permissions || []).filter(
      (permission: string) => permission !== CUSTOM_PERMISSIONS_MARKER,
    ),
    customPermissions: (user.permissions || []).includes(
      CUSTOM_PERMISSIONS_MARKER,
    ),
    createdAt: user.createdAt,
  };
}

function normalizePermissions(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map(String)
    .filter((permission) => ALLOWED_PERMISSIONS.has(permission));
}

export async function GET() {
  try {
    await requireSuperAdmin();
    const users = await prisma.user.findMany({
      orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    });
    return NextResponse.json({ users: users.map(safeUser) });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: error.message === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireSuperAdmin();
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const login = String(body?.login || "").trim().toLowerCase();
    const phone = String(body?.phone || "").trim() || null;
    const password = String(body?.password || "");
    const role = String(body?.role || "");
    const permissions = normalizePermissions(body?.permissions);

    if (!name || !login || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json(
        { error: "الاسم واسم الدخول ونوع المستخدم مطلوبون" },
        { status: 400 },
      );
    }

    if (login.length < 3 || login.length > 120 || /\s/.test(login)) {
      return NextResponse.json(
        { error: "اسم الدخول يجب أن يكون 3 أحرف على الأقل وبدون مسافات" },
        { status: 400 },
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { error: "كلمة المرور يجب ألا تقل عن 12 حرفًا" },
        { status: 400 },
      );
    }

    const storedPermissions =
      role === "SUPER_ADMIN"
        ? []
        : [CUSTOM_PERMISSIONS_MARKER, ...permissions];

    const user = await prisma.user.create({
      data: {
        name,
        email: login,
        phone,
        role: role as any,
        active: body?.active !== false,
        passwordHash: hashPassword(password),
        permissions: storedPermissions,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "USER_CREATED",
        newValue: {
          targetUserId: user.id,
          name: user.name,
          login: user.email,
          role: user.role,
          active: user.active,
          permissions,
        },
      },
    });

    return NextResponse.json({ user: safeUser(user) }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الدخول مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error.message || "تعذر إنشاء المستخدم" },
      { status: error.message === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
}
