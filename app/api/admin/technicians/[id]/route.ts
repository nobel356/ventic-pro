import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/auth-v7";
import { hashPassword } from "@/lib/password";

function safeTech(user: any) {
  return {
    id: user.id,
    name: user.name,
    login: user.email,
    phone: user.phone,
    active: user.active,
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

    const current = await prisma.user.findFirst({
      where: { id, role: "TECHNICIAN" },
    });
    if (!current) {
      return NextResponse.json({ error: "الفني غير موجود" }, { status: 404 });
    }

    const name = String(body?.name ?? current.name).trim();
    const login = String(body?.login ?? current.email).trim().toLowerCase();
    const phone =
      body?.phone === undefined
        ? current.phone
        : String(body.phone || "").trim() || null;
    const active = body?.active === undefined ? current.active : Boolean(body.active);
    const password = String(body?.password || "");

    if (!name || !login) {
      return NextResponse.json({ error: "اسم الفني واسم الدخول مطلوبان" }, { status: 400 });
    }
    if (login.length < 3 || /\s/.test(login)) {
      return NextResponse.json({ error: "اسم الدخول يجب أن يكون 3 أحرف على الأقل وبدون مسافات" }, { status: 400 });
    }
    if (password && password.length < 12) {
      return NextResponse.json({ error: "كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا" }, { status: 400 });
    }

    const technician = await prisma.user.update({
      where: { id },
      data: {
        name,
        email: login,
        phone,
        active,
        ...(password ? { passwordHash: hashPassword(password) } : {}),
      },
    });

    if (password || !active || login !== current.email) {
      await prisma.session.deleteMany({ where: { userId: id } });
    }

    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorLabel: actor.name,
        action: "TECHNICIAN_UPDATED",
        oldValue: {
          technicianId: current.id,
          name: current.name,
          login: current.email,
          phone: current.phone,
          active: current.active,
        },
        newValue: {
          technicianId: technician.id,
          name: technician.name,
          login: technician.email,
          phone: technician.phone,
          active: technician.active,
          passwordChanged: Boolean(password),
        },
      },
    });

    return NextResponse.json({ technician: safeTech(technician) });
  } catch (error: any) {
    if (error?.code === "P2002") {
      return NextResponse.json({ error: "اسم الدخول مستخدم بالفعل" }, { status: 409 });
    }
    return NextResponse.json(
      { error: error.message || "تعذر تحديث الفني" },
      { status: error.message === "UNAUTHENTICATED" ? 401 : 403 },
    );
  }
}
