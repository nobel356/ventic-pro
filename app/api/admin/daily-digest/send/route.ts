import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";
import { sendBrandedEmail } from "@/lib/branded-email";
import {
  executiveDigestText,
  getExecutiveDigest,
} from "@/lib/executive-digest";
import {
  safeDiagnostic,
  safeDiagnosticError,
} from "@/lib/safe-diagnostics";

export async function POST() {
  const user =
    await currentUser();

  if (!user) {
    return NextResponse.json(
      { error: "غير مصرح" },
      { status: 401 },
    );
  }

  if (
    user.role !==
    "SUPER_ADMIN"
  ) {
    return NextResponse.json(
      { error: "غير مسموح" },
      { status: 403 },
    );
  }

  try {
    const digest =
      await getExecutiveDigest();

    const result =
      await sendBrandedEmail({
        email: user.email,
        subject:
          "Ventic Pro — الملخص التنفيذي اليومي",
        message:
          executiveDigestText(
            digest,
          ),
      });

    safeDiagnostic(
      "daily_digest.send",
      {
        userId:
          user.id,
        sent:
          result.sent,
        provider:
          result.provider,
        destinationMasked:
          result.destinationMasked,
        failedNotifications24h:
          digest.failedNotifications24h,
        negativeOrders30d:
          digest.negativeCompletedOrders30d,
      },
    );

    if (!result.sent) {
      return NextResponse.json(
        {
          error:
            result.error ||
            "تعذر إرسال الملخص",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      destinationMasked:
        result.destinationMasked,
      provider:
        result.provider,
    });
  } catch (error) {
    safeDiagnosticError(
      "daily_digest.send",
      error,
      {
        userId:
          user.id,
      },
    );

    return NextResponse.json(
      {
        error:
          "تعذر إنشاء أو إرسال الملخص.",
      },
      { status: 500 },
    );
  }
}
