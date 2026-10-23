import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  findActiveReferral,
  referralCodeFromRequest,
} from "@/lib/referrals";

export async function GET(req: Request) {
  const code = referralCodeFromRequest(req);
  if (!code) return NextResponse.json({ referral: null });

  const referral = await findActiveReferral(prisma, code);

  if (!referral) {
    return NextResponse.json({ referral: null });
  }

  return NextResponse.json({
    referral: {
      code: referral.code,
      discountType: referral.discountType,
      discountValue: referral.discountValue,
    },
  });
}
