import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";

export async function POST(req: Request) {
  const body = await req.json();
  const identifier = String(body?.identifier ?? body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");

  if (!identifier || !password) {
    return NextResponse.json(
      { error: "اسم الدخول وكلمة المرور مطلوبان" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: identifier },
  });

  if (
    !user ||
    !user.active ||
    !user.passwordHash ||
    !verifyPassword(password, user.passwordHash)
  ) {
    return NextResponse.json(
      { error: "بيانات الدخول غير صحيحة أو الحساب غير نشط" },
      { status: 401 },
    );
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14),
    },
  });

  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set("ventic_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return res;
}
