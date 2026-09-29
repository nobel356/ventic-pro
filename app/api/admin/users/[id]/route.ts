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

function normalizePermissions(input: unknown) {
  if (!Array.isArray(input)) return [];
  return input
    .map(String)
    .filter((permission) => ALLOWED_PERMISSIONS.has(permission));
}

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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const actor = await requireSuperAdmin();
    const { id } = await params;
    const body = await req.json();

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
    }

    const name = String(body?.name ?? target.name).trim();
    const login = String(body?.login ?? target.email).trim().toLowerCase();
    const phone =
      body?.phone === undefined
        ? target.phone
        : String(body.phone || "").trim() || null;
    const role = String(body?.role ?? target.role);
    const active = body?.active === undefined ? target.active : Boolean(body.active);
    const password = String(body?.password || "");
    const permissions = normalizePermissions(body?.permissions);

    if (!name || !login || !ALLOWED_ROLES.has(role)) {
      return NextResponse.json({ error: "بيانات المستخدم غير مكتملة" }, { status: 400 });
    }

    if (login.length < 3 || login.length > 120 || /\s/.test(login)) {
      return NextResponse.json(
        { error: "اسم الدخول يجب أن يكون 3 أحرف على الأقل وبدون مسافات" },
        { status: 400 },
      );
    }

    if (password && password.length < 12) {
      return NextResponse.json(
        { error: "كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا" },
        { status: 400 },
      );
    }

    if (id === actor.id && (!active || role !== "SUPER_ADMIN")) {
      return NextResponse.json(
        { error: "لا يمكن إيقاف حسابك الحالي أو إزالة صلاحية مدير النظام منه" },
        { status: 400 },
      );
    }

    if (
      target.role === "SUPER_ADMIN" &&
      target.active &&
      (!active || role !== "SUPER_ADMIN")
    ) {
      const activeOwners = await prisma.user.count({
        where: { role: "SUPER_ADMIN", active: true },
      });
      if (activeOwners <= 1) {
        return NextResponse.json(
          { error: "لا يمكن إيقاف آخر مدير نظام نشط" },
          { status: 400 },
        );
      }
    }

    const storedPermissions =
      role === "SUPER_ADMIN"
        ? []
        : [CUSTOM_PERMISSIONS_MARKER, ...permissions];

    const user = await prisma.user.update({
      where: { id },
      data: {
        name,
        email: login,
        phone,
        role: role as any,
        active,
        permissions: storedPermissions,
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
    });

    if (
      id !== actor.id &&
      (password || !active || role !== target.role)
    ) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "USER_UPDATED",
        oldValue: {
          targetUserId: target.id,
          name: target.name,
          login: target.email,
          role: target.role,
          active: target.active,
          permissions: target.permissions,
        },
        newValue: {
          targetUserId: user.id,
          name: user.name,
          login: user.email,
          role: user.role,
          active: user.active,
          permissions,
          passwordChanged: Boolean(password),
        },
      },
    });

    return NextResponse.json({ user: safeUser(user) });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الدخول مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error.message || "تعذر تحديث المستخدم" },
      { status: error.message === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
}
