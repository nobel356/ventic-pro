import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-auth";

export async function POST() {
  const jar = await cookies();
  const raw = jar.get(CUSTOMER_SESSION_COOKIE)?.value;

  if (raw) {
    const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
    await prisma.customerSession.deleteMany({
      where: { tokenHash },
    });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set(CUSTOMER_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
