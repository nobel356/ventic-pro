type DeliveryChannel =
  | "WHATSAPP"
  | "SMS"
  | "EMAIL"
  | "NONE";

export type MessageDeliveryResult = {
  sent: boolean;
  channel: DeliveryChannel;
  provider: string;
  destinationMasked: string;
  providerMessageId?: string;
  error?: string;
};

function normalizeEgyptPhone(
  phone: string,
) {
  let digits = String(
    phone || "",
  ).replace(/\D/g, "");

  if (
    digits.startsWith("0020")
  ) {
    digits = digits.slice(2);
  }

  if (
    digits.startsWith("01") &&
    digits.length === 11
  ) {
    digits = `20${digits.slice(
      1,
    )}`;
  }

  return digits;
}

export function maskPhone(
  phone: string,
) {
  const digits = String(
    phone || "",
  ).replace(/\D/g, "");

  if (digits.length < 5) {
    return "********";
  }

  return `${digits.slice(
    0,
    3,
  )}******${digits.slice(-2)}`;
}

export function otpStagingVisible() {
  return (
    process.env.VERCEL_ENV !==
      "production" &&
    String(
      process.env
        .OTP_STAGING_VISIBLE ||
        "false",
    ).toLowerCase() === "true"
  );
}

export function passwordResetStagingVisible() {
  return (
    process.env.VERCEL_ENV !==
      "production" &&
    String(
      process.env
        .PASSWORD_RESET_STAGING_VISIBLE ||
        "false",
    ).toLowerCase() === "true"
  );
}

function templateEnv(
  key: string,
) {
  const map: Record<
    string,
    string
  > = {
    ORDER_RECEIVED:
      "WHATSAPP_ORDER_RECEIVED_TEMPLATE",
    ORDER_STATUS:
      "WHATSAPP_ORDER_STATUS_TEMPLATE",
    TECHNICIAN_ASSIGNED:
      "WHATSAPP_TECHNICIAN_ASSIGNED_TEMPLATE",
    TECHNICIAN_ON_THE_WAY:
      "WHATSAPP_TECHNICIAN_ON_THE_WAY_TEMPLATE",
    VENTIC_ESTIMATE_SENT:
      "WHATSAPP_ESTIMATE_SENT_TEMPLATE",
    PAYMENT_RECEIVED:
      "WHATSAPP_PAYMENT_RECEIVED_TEMPLATE",
    ORDER_COMPLETED:
      "WHATSAPP_ORDER_COMPLETED_TEMPLATE",
  };

  const envName = map[key];

  return envName
    ? process.env[envName]
    : undefined;
}

async function sendWhatsApp(
  input: {
    phone: string;
    message: string;
    templateKey?: string;
    templateName?: string;
    templateVariables?: string[];
  },
): Promise<MessageDeliveryResult> {
  const destinationMasked =
    maskPhone(input.phone);
  const provider = String(
    process.env.MESSAGING_PROVIDER ||
      "disabled",
  ).toLowerCase();

  if (
    provider !==
    "whatsapp_cloud"
  ) {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error:
        "WHATSAPP_NOT_CONFIGURED",
    };
  }

  const phoneNumberId =
    process.env
      .WHATSAPP_PHONE_NUMBER_ID;
  const accessToken =
    process.env
      .WHATSAPP_ACCESS_TOKEN;
  const apiVersion =
    process.env
      .WHATSAPP_GRAPH_VERSION ||
    "v23.0";

  if (
    !phoneNumberId ||
    !accessToken
  ) {
    return {
      sent: false,
      channel: "WHATSAPP",
      provider:
        "whatsapp_cloud",
      destinationMasked,
      error:
        "WHATSAPP_CREDENTIALS_MISSING",
    };
  }

  const templateName =
    input.templateName ||
    (input.templateKey
      ? templateEnv(
          input.templateKey,
        )
      : undefined);
  const language =
    process.env
      .WHATSAPP_TEMPLATE_LANGUAGE ||
    "ar";

  const body = templateName
    ? {
        messaging_product:
          "whatsapp",
        to: normalizeEgyptPhone(
          input.phone,
        ),
        type: "template",
        template: {
          name: templateName,
          language: {
            code: language,
          },
          components:
            input
              .templateVariables
              ?.length
              ? [
                  {
                    type: "body",
                    parameters:
                      input.templateVariables.map(
                        (text) => ({
                          type: "text",
                          text,
                        }),
                      ),
                  },
                ]
              : undefined,
        },
      }
    : {
        messaging_product:
          "whatsapp",
        to: normalizeEgyptPhone(
          input.phone,
        ),
        type: "text",
        text: {
          preview_url: false,
          body: input.message,
        },
      };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          body,
        ),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      return {
        sent: false,
        channel:
          "WHATSAPP",
        provider:
          "whatsapp_cloud",
        destinationMasked,
        error:
          `WHATSAPP_${response.status}:${responseText.slice(
            0,
            250,
          )}`,
      };
    }

    let providerMessageId:
      | string
      | undefined;

    try {
      const parsed =
        JSON.parse(
          responseText,
        );
      providerMessageId =
        parsed?.messages?.[0]
          ?.id;
    } catch {
      // Optional provider id.
    }

    return {
      sent: true,
      channel: "WHATSAPP",
      provider:
        "whatsapp_cloud",
      destinationMasked,
      providerMessageId,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "WHATSAPP",
      provider:
        "whatsapp_cloud",
      destinationMasked,
      error:
        error?.message ||
        "WHATSAPP_SEND_FAILED",
    };
  }
}

async function sendSms(
  input: {
    phone: string;
    message: string;
  },
): Promise<MessageDeliveryResult> {
  const destinationMasked =
    maskPhone(input.phone);
  const provider = String(
    process.env.SMS_PROVIDER ||
      "disabled",
  ).toLowerCase();

  if (provider !== "twilio") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error:
        "SMS_NOT_CONFIGURED",
    };
  }

  const accountSid =
    process.env
      .TWILIO_ACCOUNT_SID;
  const authToken =
    process.env
      .TWILIO_AUTH_TOKEN;
  const from =
    process.env
      .TWILIO_FROM_NUMBER;

  if (
    !accountSid ||
    !authToken ||
    !from
  ) {
    return {
      sent: false,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      error:
        "TWILIO_CREDENTIALS_MISSING",
    };
  }

  const form =
    new URLSearchParams();
  form.set(
    "To",
    `+${normalizeEgyptPhone(
      input.phone,
    )}`,
  );
  form.set("From", from);
  form.set(
    "Body",
    input.message,
  );

  try {
    const auth = Buffer.from(
      `${accountSid}:${authToken}`,
    ).toString("base64");

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Basic ${auth}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      return {
        sent: false,
        channel: "SMS",
        provider: "twilio",
        destinationMasked,
        error:
          `TWILIO_${response.status}:${responseText.slice(
            0,
            250,
          )}`,
      };
    }

    let providerMessageId:
      | string
      | undefined;

    try {
      providerMessageId =
        JSON.parse(
          responseText,
        )?.sid;
    } catch {
      // Optional provider id.
    }

    return {
      sent: true,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      providerMessageId,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      error:
        error?.message ||
        "SMS_SEND_FAILED",
    };
  }
}

async function sendEmail(
  input: {
    email?: string | null;
    subject: string;
    message: string;
  },
): Promise<MessageDeliveryResult> {
  const email = String(
    input.email || "",
  ).trim();

  if (!email) {
    return {
      sent: false,
      channel: "NONE",
      provider:
        "disabled",
      destinationMasked: "",
      error:
        "EMAIL_NOT_AVAILABLE",
    };
  }

  const provider = String(
    process.env.EMAIL_PROVIDER ||
      "disabled",
  ).toLowerCase();

  if (provider !== "resend") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked:
        email.replace(
          /(^.).*(@.*$)/,
          "$1***$2",
        ),
      error:
        "EMAIL_NOT_CONFIGURED",
    };
  }

  const apiKey =
    process.env.RESEND_API_KEY;
  const from =
    process.env
      .EMAIL_FROM;

  if (!apiKey || !from) {
    return {
      sent: false,
      channel: "EMAIL",
      provider: "resend",
      destinationMasked:
        email.replace(
          /(^.).*(@.*$)/,
          "$1***$2",
        ),
      error:
        "RESEND_CREDENTIALS_MISSING",
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
          subject:
            input.subject,
          text: input.message,
        }),
      },
    );

    const responseText =
      await response.text();

    if (!response.ok) {
      return {
        sent: false,
        channel: "EMAIL",
        provider: "resend",
        destinationMasked:
          email.replace(
            /(^.).*(@.*$)/,
            "$1***$2",
          ),
        error:
          `RESEND_${response.status}:${responseText.slice(
            0,
            250,
          )}`,
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
    } catch {
      // Optional provider id.
    }

    return {
      sent: true,
      channel: "EMAIL",
      provider: "resend",
      destinationMasked:
        email.replace(
          /(^.).*(@.*$)/,
          "$1***$2",
        ),
      providerMessageId,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "EMAIL",
      provider: "resend",
      destinationMasked:
        email.replace(
          /(^.).*(@.*$)/,
          "$1***$2",
        ),
      error:
        error?.message ||
        "EMAIL_SEND_FAILED",
    };
  }
}

export async function deliverCustomerMessage(
  input: {
    phone: string;
    email?: string | null;
    templateKey?: string;
    templateName?: string;
    templateVariables?: string[];
    subject?: string;
    message: string;
  },
): Promise<MessageDeliveryResult> {
  const whatsapp =
    await sendWhatsApp({
      phone: input.phone,
      message: input.message,
      templateKey:
        input.templateKey,
      templateName:
        input.templateName,
      templateVariables:
        input.templateVariables,
    });

  if (whatsapp.sent) {
    return whatsapp;
  }

  const sms = await sendSms({
    phone: input.phone,
    message: input.message,
  });

  if (sms.sent) {
    return sms;
  }

  const email =
    await sendEmail({
      email: input.email,
      subject:
        input.subject ||
        "Ventic Pro",
      message: input.message,
    });

  if (email.sent) {
    return email;
  }

  return {
    sent: false,
    channel:
      whatsapp.channel !==
      "NONE"
        ? whatsapp.channel
        : sms.channel !==
            "NONE"
          ? sms.channel
          : email.channel,
    provider:
      whatsapp.channel !==
      "NONE"
        ? whatsapp.provider
        : sms.channel !==
            "NONE"
          ? sms.provider
          : email.provider,
    destinationMasked:
      whatsapp
        .destinationMasked ||
      sms.destinationMasked ||
      email.destinationMasked ||
      maskPhone(input.phone),
    error: [
      whatsapp.error,
      sms.error,
      email.error,
    ]
      .filter(Boolean)
      .join(" | "),
  };
}

export async function deliverCompletionOtp(
  input: {
    phone: string;
    otp: string;
    orderNo: string;
  },
) {
  const message =
    `Ventic Pro\nكود تأكيد إتمام الطلب ${input.orderNo}: ${input.otp}\n` +
    "الكود صالح لمدة 15 دقيقة. لا تشاركه إلا مع الفني بعد التأكد من اكتمال الخدمة.";

  return deliverCustomerMessage({
    phone: input.phone,
    templateName:
      process.env
        .WHATSAPP_ORDER_COMPLETION_OTP_TEMPLATE ||
      process.env
        .WHATSAPP_OTP_TEMPLATE,
    templateVariables: [
      input.otp,
      input.orderNo,
    ],
    message,
  });
}

export async function deliverCustomerPasswordResetOtp(
  input: {
    phone: string;
    otp: string;
  },
) {
  const message =
    `Ventic Pro\nكود إعادة تعيين كلمة المرور: ${input.otp}\n` +
    "الكود صالح لمدة 10 دقائق. إذا لم تطلب تغيير كلمة المرور تجاهل الرسالة.";

  const whatsappTemplate =
    process.env
      .WHATSAPP_PASSWORD_RESET_TEMPLATE;

  if (whatsappTemplate) {
    const destinationMasked =
      maskPhone(input.phone);
    const phoneNumberId =
      process.env
        .WHATSAPP_PHONE_NUMBER_ID;
    const accessToken =
      process.env
        .WHATSAPP_ACCESS_TOKEN;
    const apiVersion =
      process.env
        .WHATSAPP_GRAPH_VERSION ||
      "v23.0";
    const provider = String(
      process.env
        .MESSAGING_PROVIDER ||
        "disabled",
    ).toLowerCase();

    if (
      provider ===
        "whatsapp_cloud" &&
      phoneNumberId &&
      accessToken
    ) {
      try {
        const response =
          await fetch(
            `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
            {
              method: "POST",
              headers: {
                Authorization:
                  `Bearer ${accessToken}`,
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                messaging_product:
                  "whatsapp",
                to: normalizeEgyptPhone(
                  input.phone,
                ),
                type: "template",
                template: {
                  name:
                    whatsappTemplate,
                  language: {
                    code:
                      process.env
                        .WHATSAPP_PASSWORD_RESET_TEMPLATE_LANGUAGE ||
                      "ar",
                  },
                  components: [
                    {
                      type: "body",
                      parameters: [
                        {
                          type: "text",
                          text: input.otp,
                        },
                      ],
                    },
                  ],
                },
              }),
            },
          );

        if (response.ok) {
          const responseText =
            await response.text();
          let providerMessageId:
            | string
            | undefined;
          try {
            providerMessageId =
              JSON.parse(
                responseText,
              )?.messages?.[0]
                ?.id;
          } catch {}

          return {
            sent: true,
            channel:
              "WHATSAPP" as const,
            provider:
              "whatsapp_cloud",
            destinationMasked,
            providerMessageId,
          };
        }
      } catch {
        // SMS fallback below.
      }
    }
  }

  return deliverCustomerMessage({
    phone: input.phone,
    message,
  });
}
