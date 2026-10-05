import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  requirePermission,
  requireSuperAdmin,
} from "@/lib/auth-v7";
import { hashPassword } from "@/lib/password";

function safeTech(user: any) {
  return {
    id: user.id,
    name: user.name,
    login: user.email,
    email: user.email,
    phone: user.phone,
    active: user.active,
    createdAt: user.createdAt,
  };
}

export async function GET(req: Request) {
  try {
    const actor = await requirePermission(PERMISSIONS.ORDERS_VIEW);
    const technicians = await prisma.user.findMany({
      where: { role: "TECHNICIAN" },
      orderBy: [{ active: "desc" }, { name: "asc" }],
    });

    const list = technicians.map(safeTech);
    const management =
      new URL(req.url).searchParams.get("management") === "1";

    // The orders screen expects the legacy array response.
    // The technicians management screen requests ?management=1
    // so it can also receive the permission flag without breaking old pages.
    if (management) {
      return NextResponse.json(
        {
          technicians: list,
          canManage: actor.role === "SUPER_ADMIN",
        },
        {
          headers: {
            "Cache-Control": "no-store, max-age=0",
          },
        },
      );
    }

    return NextResponse.json(list, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "تعذر تحميل الفنيين" },
      { status: error.message === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const actor = await requireSuperAdmin();
    const body = await req.json();

    const name = String(body?.name || "").trim();
    const login = String(body?.login || body?.email || "")
      .trim()
      .toLowerCase();
    const phone = String(body?.phone || "").trim() || null;
    const password = String(body?.password || "");

    if (!name || !login) {
      return NextResponse.json(
        { error: "اسم الفني واسم الدخول مطلوبان" },
        { status: 400 },
      );
    }

    if (login.length < 3 || /\s/.test(login)) {
      return NextResponse.json(
        { error: "اسم الدخول يجب أن يكون 3 أحرف على الأقل وبدون مسافات" },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "كلمة المرور يجب ألا تقل عن 6 أحرف" },
        { status: 400 },
      );
    }

    const technician = await prisma.user.create({
      data: {
        name,
        email: login,
        phone,
        passwordHash: hashPassword(password),
        role: "TECHNICIAN",
        active: body?.active !== false,
        permissions: [],
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "TECHNICIAN_CREATED",
        newValue: {
          technicianId: technician.id,
          name: technician.name,
          login: technician.email,
          phone: technician.phone,
        },
      },
    });

    return NextResponse.json(
      { technician: safeTech(technician) },
      { status: 201 },
    );
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "اسم الدخول مستخدم بالفعل" },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: error.message || "تعذر إضافة الفني" },
      { status: error.message === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
}
