import type { MessageDeliveryResult } from "@/lib/customer-messaging";

function maskEmail(email: string) {
  return email.replace(
    /(^.).*(@.*$)/,
    "$1***$2",
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function messageHtml(message: string) {
  return escapeHtml(message)
    .split(/\r?\n/)
    .map((line) =>
      line.trim()
        ? `<div style="margin:0 0 8px">${line}</div>`
        : `<div style="height:6px"></div>`,
    )
    .join("");
}

export function brandedEmailHtml(input: {
  subject: string;
  message: string;
}) {
  const configuredUrl = String(
    process.env.NEXT_PUBLIC_APP_URL || "",
  ).replace(/\/+$/, "");

  const vercelHost =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL;

  const appUrl =
    configuredUrl ||
    (vercelHost
      ? `https://${vercelHost}`
      : "");

  const safeSubject =
    escapeHtml(input.subject);
  const body =
    messageHtml(input.message);

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${safeSubject}</title>
  </head>
  <body style="margin:0;background:#f5f8fb;font-family:Arial,Tahoma,sans-serif;color:#0f172a">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f8fb;padding:24px 12px">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#ffffff;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
            <tr>
              <td style="background:#0f2d4a;padding:20px 24px;color:#ffffff">
                <div style="font-size:24px;font-weight:800">Ventic Pro</div>
                <div style="color:#bfdbfe;margin-top:4px;font-size:13px">حلول التهوية والتركيب</div>
              </td>
            </tr>
            <tr>
              <td style="padding:24px">
                <h1 style="font-size:21px;line-height:1.5;margin:0 0 18px;color:#0f2d4a">${safeSubject}</h1>
                <div style="font-size:15px;line-height:1.9;color:#334155">${body}</div>
                ${
                  appUrl
                    ? `<div style="margin-top:24px">
                        <a href="${escapeHtml(appUrl)}" style="display:inline-block;background:#f97316;color:#ffffff;text-decoration:none;padding:11px 17px;border-radius:10px;font-weight:800">فتح Ventic Pro</a>
                      </div>`
                    : ""
                }
              </td>
            </tr>
            <tr>
              <td style="border-top:1px solid #e2e8f0;padding:16px 24px;color:#64748b;font-size:12px;line-height:1.7">
                هذه رسالة توثيقية من Ventic Pro. احتفظ بها للرجوع إلى تفاصيل طلبك.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export async function sendBrandedEmail(
  input: {
    email?: string | null;
    subject: string;
    message: string;
  },
): Promise<MessageDeliveryResult> {
  const email = String(
    input.email || "",
  ).trim();
  const provider = String(
    process.env.EMAIL_PROVIDER ||
      "disabled",
  ).toLowerCase();
  const destinationMasked =
    email ? maskEmail(email) : "";

  console.info(
    "[EMAIL_HTML] send:start",
    {
      emailPresent: Boolean(email),
      provider,
      apiKeyPresent: Boolean(
        process.env.RESEND_API_KEY,
      ),
      fromPresent: Boolean(
        process.env.EMAIL_FROM,
      ),
    },
  );

  if (!email) {
    return {
      sent: false,
      channel: "NONE",
      provider: "disabled",
      destinationMasked,
      error: "EMAIL_NOT_AVAILABLE",
    };
  }

  if (provider !== "resend") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error: "EMAIL_NOT_CONFIGURED",
    };
  }

  const apiKey =
    process.env.RESEND_API_KEY;
  const from =
    process.env.EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      channel: "EMAIL",
      provider: "resend",
      destinationMasked,
      error: "RESEND_CREDENTIALS_MISSING",
    };
  }

  try {
    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: input.subject,
          text: input.message,
          html: brandedEmailHtml({
            subject: input.subject,
            message: input.message,
          }),
        }),
      },
    );

    const responseText =
      await response.text();

    console.info(
      "[EMAIL_HTML] resend:response",
      {
        ok: response.ok,
        status: response.status,
        destinationMasked,
      },
    );

    if (!response.ok) {
      return {
        sent: false,
        channel: "EMAIL",
        provider: "resend",
        destinationMasked,
        error:
          `RESEND_${response.status}:${responseText.slice(0, 250)}`,
      };
    }

    let providerMessageId:
      | string
      | undefined;

    try {
      providerMessageId =
        JSON.parse(
          responseText,
        )?.id;
    } catch {}

    return {
      sent: true,
      channel: "EMAIL",
      provider: "resend",
      destinationMasked,
      providerMessageId,
    };
  } catch (error: any) {
    console.error(
      "[EMAIL_HTML] resend:exception",
      {
        message:
          error?.message ||
          "EMAIL_SEND_FAILED",
        destinationMasked,
      },
    );

    return {
      sent: false,
      channel: "EMAIL",
      provider: "resend",
      destinationMasked,
      error:
        error?.message ||
        "EMAIL_SEND_FAILED",
    };
  }
}
