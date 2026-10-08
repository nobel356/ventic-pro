import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";
import { sendEmail } from "@/lib/customer-messaging";

export async function POST(
  req: Request,
) {
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

  const body =
    await req.json();
  const email = String(
    body?.email || "",
  ).trim();

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email,
    )
  ) {
    return NextResponse.json(
      {
        error:
          "اكتب بريدًا إلكترونيًا صحيحًا",
      },
      { status: 400 },
    );
  }

  const result =
    await sendEmail({
      email,
      subject:
        "اختبار Ventic Pro",
      message:
        "Ventic Pro\nرسالة اختبار من مركز صحة النظام.\nإذا وصلت الرسالة فإعدادات Resend تعمل بشكل صحيح.",
    });

  console.info(
    "[SYSTEM_HEALTH] email-test",
    {
      sent: result.sent,
      channel: result.channel,
      provider:
        result.provider,
      destinationMasked:
        result.destinationMasked,
      error: result.error || null,
    },
  );

  if (!result.sent) {
    return NextResponse.json(
      {
        error:
          result.error ||
          "تعذر إرسال الاختبار",
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
}
