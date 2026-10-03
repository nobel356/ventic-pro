type DeliveryChannel = "WHATSAPP" | "SMS" | "NONE";

export type OtpDeliveryResult = {
  sent: boolean;
  channel: DeliveryChannel;
  provider: string;
  destinationMasked: string;
  error?: string;
};

function normalizeEgyptPhone(phone: string) {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("0020")) digits = digits.slice(2);
  if (digits.startsWith("01") && digits.length === 11) {
    digits = `20${digits.slice(1)}`;
  }

  return digits;
}

export function maskPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length < 5) return "********";
  return `${digits.slice(0, 3)}******${digits.slice(-2)}`;
}

export function otpStagingVisible() {
  const explicit = process.env.OTP_STAGING_VISIBLE;

  if (explicit !== undefined) {
    return explicit.toLowerCase() === "true";
  }

  const messagingProvider = String(
    process.env.MESSAGING_PROVIDER || "disabled",
  ).toLowerCase();

  return messagingProvider === "disabled";
}

async function sendWhatsApp(
  phone: string,
  otp: string,
  orderNo: string,
): Promise<OtpDeliveryResult> {
  const destinationMasked = maskPhone(phone);
  const provider = String(
    process.env.MESSAGING_PROVIDER || "disabled",
  ).toLowerCase();

  if (provider !== "whatsapp_cloud") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error: "WHATSAPP_NOT_CONFIGURED",
    };
  }

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion =
    process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

  if (!phoneNumberId || !accessToken) {
    return {
      sent: false,
      channel: "WHATSAPP",
      provider: "whatsapp_cloud",
      destinationMasked,
      error: "WHATSAPP_CREDENTIALS_MISSING",
    };
  }

  const to = normalizeEgyptPhone(phone);
  const templateName =
    process.env.WHATSAPP_OTP_TEMPLATE;
  const language =
    process.env.WHATSAPP_OTP_TEMPLATE_LANGUAGE || "ar";

  const body = templateName
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: otp },
                { type: "text", text: orderNo },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: `Ventic Pro\nكود تأكيد إتمام الطلب ${orderNo}: ${otp}\nالكود صالح لمدة 15 دقيقة. لا تشاركه إلا مع الفني بعد التأكد من اكتمال الخدمة.`,
        },
      };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return {
        sent: false,
        channel: "WHATSAPP",
        provider: "whatsapp_cloud",
        destinationMasked,
        error: `WHATSAPP_${response.status}:${detail.slice(0, 250)}`,
      };
    }

    return {
      sent: true,
      channel: "WHATSAPP",
      provider: "whatsapp_cloud",
      destinationMasked,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "WHATSAPP",
      provider: "whatsapp_cloud",
      destinationMasked,
      error: error?.message || "WHATSAPP_SEND_FAILED",
    };
  }
}

async function sendSms(
  phone: string,
  otp: string,
  orderNo: string,
): Promise<OtpDeliveryResult> {
  const destinationMasked = maskPhone(phone);
  const provider = String(
    process.env.SMS_PROVIDER || "disabled",
  ).toLowerCase();

  if (provider !== "twilio") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error: "SMS_NOT_CONFIGURED",
    };
  }

  const accountSid =
    process.env.TWILIO_ACCOUNT_SID;
  const authToken =
    process.env.TWILIO_AUTH_TOKEN;
  const from =
    process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return {
      sent: false,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      error: "TWILIO_CREDENTIALS_MISSING",
    };
  }

  const toDigits = normalizeEgyptPhone(phone);
  const to = `+${toDigits}`;
  const form = new URLSearchParams();
  form.set("To", to);
  form.set("From", from);
  form.set(
    "Body",
    `Ventic Pro: كود تأكيد إتمام الطلب ${orderNo} هو ${otp}. صالح لمدة 15 دقيقة.`,
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
          Authorization: `Basic ${auth}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!response.ok) {
      const detail = await response.text();
      return {
        sent: false,
        channel: "SMS",
        provider: "twilio",
        destinationMasked,
        error: `TWILIO_${response.status}:${detail.slice(0, 250)}`,
      };
    }

    return {
      sent: true,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      error: error?.message || "SMS_SEND_FAILED",
    };
  }
}

export async function deliverCompletionOtp(input: {
  phone: string;
  otp: string;
  orderNo: string;
}): Promise<OtpDeliveryResult> {
  const whatsapp = await sendWhatsApp(
    input.phone,
    input.otp,
    input.orderNo,
  );

  if (whatsapp.sent) return whatsapp;

  const sms = await sendSms(
    input.phone,
    input.otp,
    input.orderNo,
  );

  if (sms.sent) return sms;

  return {
    sent: false,
    channel:
      whatsapp.channel !== "NONE"
        ? whatsapp.channel
        : sms.channel,
    provider:
      whatsapp.channel !== "NONE"
        ? whatsapp.provider
        : sms.provider,
    destinationMasked: maskPhone(input.phone),
    error: [whatsapp.error, sms.error]
      .filter(Boolean)
      .join(" | "),
  };
}


export function passwordResetStagingVisible() {
  return (
    String(
      process.env.PASSWORD_RESET_STAGING_VISIBLE || "false",
    ).toLowerCase() === "true"
  );
}

async function sendPasswordResetWhatsApp(
  phone: string,
  otp: string,
): Promise<OtpDeliveryResult> {
  const destinationMasked = maskPhone(phone);
  const provider = String(
    process.env.MESSAGING_PROVIDER || "disabled",
  ).toLowerCase();

  if (provider !== "whatsapp_cloud") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error: "WHATSAPP_NOT_CONFIGURED",
    };
  }

  const phoneNumberId =
    process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken =
    process.env.WHATSAPP_ACCESS_TOKEN;
  const apiVersion =
    process.env.WHATSAPP_GRAPH_VERSION || "v23.0";

  if (!phoneNumberId || !accessToken) {
    return {
      sent: false,
      channel: "WHATSAPP",
      provider: "whatsapp_cloud",
      destinationMasked,
      error: "WHATSAPP_CREDENTIALS_MISSING",
    };
  }

  const to = normalizeEgyptPhone(phone);
  const templateName =
    process.env.WHATSAPP_PASSWORD_RESET_TEMPLATE;
  const language =
    process.env.WHATSAPP_PASSWORD_RESET_TEMPLATE_LANGUAGE || "ar";

  const body = templateName
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: templateName,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: otp },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: {
          preview_url: false,
          body: `Ventic Pro\nكود إعادة تعيين كلمة المرور: ${otp}\nالكود صالح لمدة 10 دقائق. إذا لم تطلب تغيير كلمة المرور تجاهل الرسالة.`,
        },
      };

  try {
    const response = await fetch(
      `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!response.ok) {
      const detail = await response.text();

      return {
        sent: false,
        channel: "WHATSAPP",
        provider: "whatsapp_cloud",
        destinationMasked,
        error: `WHATSAPP_${response.status}:${detail.slice(0, 250)}`,
      };
    }

    return {
      sent: true,
      channel: "WHATSAPP",
      provider: "whatsapp_cloud",
      destinationMasked,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "WHATSAPP",
      provider: "whatsapp_cloud",
      destinationMasked,
      error: error?.message || "WHATSAPP_SEND_FAILED",
    };
  }
}

async function sendPasswordResetSms(
  phone: string,
  otp: string,
): Promise<OtpDeliveryResult> {
  const destinationMasked = maskPhone(phone);
  const provider = String(
    process.env.SMS_PROVIDER || "disabled",
  ).toLowerCase();

  if (provider !== "twilio") {
    return {
      sent: false,
      channel: "NONE",
      provider,
      destinationMasked,
      error: "SMS_NOT_CONFIGURED",
    };
  }

  const accountSid =
    process.env.TWILIO_ACCOUNT_SID;
  const authToken =
    process.env.TWILIO_AUTH_TOKEN;
  const from =
    process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !from) {
    return {
      sent: false,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      error: "TWILIO_CREDENTIALS_MISSING",
    };
  }

  const form = new URLSearchParams();
  form.set("To", `+${normalizeEgyptPhone(phone)}`);
  form.set("From", from);
  form.set(
    "Body",
    `Ventic Pro: كود إعادة تعيين كلمة المرور هو ${otp}. صالح لمدة 10 دقائق.`,
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
          Authorization: `Basic ${auth}`,
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      },
    );

    if (!response.ok) {
      const detail = await response.text();

      return {
        sent: false,
        channel: "SMS",
        provider: "twilio",
        destinationMasked,
        error: `TWILIO_${response.status}:${detail.slice(0, 250)}`,
      };
    }

    return {
      sent: true,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
    };
  } catch (error: any) {
    return {
      sent: false,
      channel: "SMS",
      provider: "twilio",
      destinationMasked,
      error: error?.message || "SMS_SEND_FAILED",
    };
  }
}

export async function deliverCustomerPasswordResetOtp(input: {
  phone: string;
  otp: string;
}): Promise<OtpDeliveryResult> {
  const whatsapp = await sendPasswordResetWhatsApp(
    input.phone,
    input.otp,
  );

  if (whatsapp.sent) return whatsapp;

  const sms = await sendPasswordResetSms(
    input.phone,
    input.otp,
  );

  if (sms.sent) return sms;

  return {
    sent: false,
    channel:
      whatsapp.channel !== "NONE"
        ? whatsapp.channel
        : sms.channel,
    provider:
      whatsapp.channel !== "NONE"
        ? whatsapp.provider
        : sms.provider,
    destinationMasked: maskPhone(input.phone),
    error: [whatsapp.error, sms.error]
      .filter(Boolean)
      .join(" | "),
  };
}
