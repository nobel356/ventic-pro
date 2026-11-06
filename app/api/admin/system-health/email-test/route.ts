import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth-v7";
import { sendBrandedEmail } from "@/lib/branded-email";
import { sendEmail } from "@/lib/customer-messaging";

type EmailQaMode =
  | "RESET_PASSWORD"
  | "BRANDED"
  | "FAILURE_CONTRACT";

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
  const mode: EmailQaMode =
    body?.mode ===
      "RESET_PASSWORD" ||
    body?.mode === "BRANDED" ||
    body?.mode ===
      "FAILURE_CONTRACT"
      ? body.mode
      : "BRANDED";

  if (
    mode ===
    "FAILURE_CONTRACT"
  ) {
    const [
      resetFailure,
      brandedFailure,
    ] = await Promise.all([
      sendEmail({
        email: null,
        subject:
          "Ventic Pro QA",
        message:
          "Failure contract test",
      }),
      sendBrandedEmail({
        email: null,
        subject:
          "Ventic Pro QA",
        message:
          "Failure contract test",
      }),
    ]);

    const passed =
      !resetFailure.sent &&
      !brandedFailure.sent &&
      resetFailure.error ===
        "EMAIL_NOT_AVAILABLE" &&
      brandedFailure.error ===
        "EMAIL_NOT_AVAILABLE";

    console.info(
      "[SYSTEM_HEALTH] email-failure-contract",
      {
        passed,
        resetError:
          resetFailure.error ||
          null,
        brandedError:
          brandedFailure.error ||
          null,
      },
    );

    return NextResponse.json(
      {
        ok: passed,
        mode,
        checks: {
          resetPassword:
            resetFailure.error,
          branded:
            brandedFailure.error,
        },
      },
      {
        status: passed
          ? 200
          : 500,
      },
    );
  }

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
    mode ===
    "RESET_PASSWORD"
      ? await sendEmail({
          email,
          subject:
            "Ventic Pro QA — Password Reset",
          message:
            "اختبار QA لمسار استعادة كلمة المرور. هذه ليست محاولة حقيقية لإعادة تعيين كلمة المرور ولا يوجد OTP صالح داخل الرسالة.",
        })
      : await sendBrandedEmail({
          email,
          subject:
            "Ventic Pro QA — Order / Invoice / Warranty",
          message:
            "اختبار QA لقالب رسائل الطلب والفاتورة والضمان. لا توجد أي بيانات عميل أو طلب حقيقي في هذه الرسالة.",
        });

  console.info(
    "[SYSTEM_HEALTH] email-test",
    {
      mode,
      sent: result.sent,
      channel: result.channel,
      provider:
        result.provider,
      destinationMasked:
        result.destinationMasked,
      providerMessageId:
        result.providerMessageId ||
        null,
      error:
        result.error || null,
    },
  );

  if (!result.sent) {
    return NextResponse.json(
      {
        error:
          result.error ||
          "تعذر إرسال الاختبار",
        mode,
        provider:
          result.provider,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    mode,
    destinationMasked:
      result.destinationMasked,
    provider:
      result.provider,
    providerMessageId:
      result.providerMessageId ||
      null,
  });
}
