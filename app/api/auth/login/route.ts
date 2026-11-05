import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import {
  clearDurableRateLimit,
  clientIp,
  durableRateLimit,
  rateLimitHeaders,
} from "@/lib/request-security";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 8;
const LOGIN_IP_LIMIT = 30;

export async function POST(req: Request) {
  const ip = clientIp(req);
  const ipKey =
    `staff-login-ip:${ip}`;
  const ipLimited =
    await durableRateLimit(ipKey, {
      limit: LOGIN_IP_LIMIT,
      windowMs: LOGIN_WINDOW_MS,
    });

  if (!ipLimited.allowed) {
    return NextResponse.json(
      {
        error:
          "تم تجاوز عدد محاولات الدخول. حاول مرة أخرى بعد قليل.",
      },
      {
        status: 429,
        headers:
          rateLimitHeaders(ipLimited),
      },
    );
  }

  const body = await req.json();
  const identifier = String(
    body?.identifier ?? body?.email ?? "",
  )
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  const rateKey =
    `staff-login:${ip}:${identifier || "empty"}`;
  const limited =
    await durableRateLimit(rateKey, {
    limit: LOGIN_LIMIT,
    windowMs: LOGIN_WINDOW_MS,
  });

  if (!limited.allowed) {
    return NextResponse.json(
      {
        error:
          "تم تجاوز عدد محاولات الدخول. حاول مرة أخرى بعد قليل.",
      },
      {
        status: 429,
        headers: rateLimitHeaders(limited),
      },
    );
  }

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
      {
        error:
          "بيانات الدخول غير صحيحة أو الحساب غير نشط",
      },
      { status: 401 },
    );
  }

  await clearDurableRateLimit(
    rateKey,
  );

  const now = new Date();

  await prisma.session.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        {
          userId: user.id,
          createdAt: {
            lt: new Date(
              Date.now() - 45 * 24 * 60 * 60 * 1000,
            ),
          },
        },
      ],
    },
  });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");

  await prisma.session.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt: new Date(
        Date.now() + 1000 * 60 * 60 * 24 * 14,
      ),
    },
  });

  const res = NextResponse.json({
    ok: true,
    role: user.role,
  });

  res.cookies.set("ventic_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });

  return res;
}
