import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { findActiveReferral } from "@/lib/referrals";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code: rawCode } = await context.params;
  const code = decodeURIComponent(rawCode || "").trim().toUpperCase();
  const referral = await findActiveReferral(prisma, code);

  const target = new URL("/order", req.url);

  if (!referral) {
    target.searchParams.set("referral", "invalid");
    return NextResponse.redirect(target);
  }

  target.searchParams.set("utm_source", "Referral");
  target.searchParams.set("utm_medium", "referral");
  target.searchParams.set("utm_campaign", referral.code);

  await prisma.auditLog.create({
    data: {
      actorLabel: "زائر إحالة",
      action: "MARKETING_EVENT",
      newValue: {
        event: "referral_visit",
        path: `/ref/${code}`,
        source: `Referral [campaign=${code}]`,
        detail: { code },
      },
    },
  });

  const response = NextResponse.redirect(target);

  response.cookies.set("ventic_referral", referral.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
