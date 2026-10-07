import crypto from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const jar = await cookies();
  const raw = jar.get("ventic_session")?.value;

  if (raw) {
    const tokenHash = crypto
      .createHash("sha256")
      .update(raw)
      .digest("hex");

    await prisma.session.deleteMany({
      where: { tokenHash },
    });
  }

  const response = NextResponse.json({ ok: true });

  for (const name of [
    "ventic_session",
    "ventic_tech",
    "ventic_impersonation",
  ]) {
    response.cookies.set(name, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
  }

  return response;
}
