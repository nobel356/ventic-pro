const failures = [];
const warnings = [];

const storage = String(
  process.env.STORAGE_PROVIDER || "disabled",
).toLowerCase();

if (storage !== "vercel_blob") {
  failures.push(
    "STORAGE_PROVIDER must be vercel_blob for persistent production photos.",
  );
}

const messaging = String(
  process.env.MESSAGING_PROVIDER || "disabled",
).toLowerCase();
const sms = String(
  process.env.SMS_PROVIDER || "disabled",
).toLowerCase();

if (
  messaging !== "whatsapp_cloud" &&
  sms !== "twilio"
) {
  failures.push(
    "Configure WhatsApp Cloud or Twilio SMS so production OTP can be delivered.",
  );
}

if (messaging === "whatsapp_cloud") {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) {
    failures.push("WHATSAPP_PHONE_NUMBER_ID is missing.");
  }
  if (!process.env.WHATSAPP_ACCESS_TOKEN) {
    failures.push("WHATSAPP_ACCESS_TOKEN is missing.");
  }
}

if (sms === "twilio") {
  for (const key of [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_FROM_NUMBER",
  ]) {
    if (!process.env[key]) {
      failures.push(`${key} is missing.`);
    }
  }
}

if (!process.env.NEXT_PUBLIC_APP_URL) {
  warnings.push(
    "NEXT_PUBLIC_APP_URL is missing; public links will fall back to the Vercel production hostname.",
  );
}

if (!process.env.NEXT_PUBLIC_GTM_ID) {
  warnings.push(
    "NEXT_PUBLIC_GTM_ID is missing; GA4/Meta/TikTok should be managed through GTM before marketing launch.",
  );
}

if (
  !process.env.NEXT_PUBLIC_GTM_ID &&
  !process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID
) {
  warnings.push(
    "Neither GTM nor direct GA4 measurement ID is configured.",
  );
}

if (!process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID) {
  warnings.push(
    "NEXT_PUBLIC_CLARITY_PROJECT_ID is missing; heatmaps/session recordings are not active.",
  );
}

if (!process.env.NEXT_PUBLIC_GOOGLE_REVIEW_URL) {
  warnings.push(
    "NEXT_PUBLIC_GOOGLE_REVIEW_URL is missing; high-rating customers will not see the Google Review CTA.",
  );
}

const recommendedTemplates = [
  "WHATSAPP_ORDER_COMPLETION_OTP_TEMPLATE",
  "WHATSAPP_PASSWORD_RESET_TEMPLATE",
  "WHATSAPP_ORDER_RECEIVED_TEMPLATE",
  "WHATSAPP_ORDER_STATUS_TEMPLATE",
  "WHATSAPP_TECHNICIAN_ASSIGNED_TEMPLATE",
  "WHATSAPP_TECHNICIAN_ON_THE_WAY_TEMPLATE",
  "WHATSAPP_ESTIMATE_SENT_TEMPLATE",
  "WHATSAPP_PAYMENT_RECEIVED_TEMPLATE",
  "WHATSAPP_ORDER_COMPLETED_TEMPLATE",
];

if (messaging === "whatsapp_cloud") {
  const missingTemplates = recommendedTemplates.filter(
    (key) => !process.env[key],
  );

  if (missingTemplates.length) {
    warnings.push(
      `WhatsApp templates not configured: ${missingTemplates.join(", ")}. Text messages may only work inside an active WhatsApp customer-service window.`,
    );
  }
}

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (failures.length) {
  for (const failure of failures) {
    console.error(`FAIL: ${failure}`);
  }
  process.exit(1);
}

console.log("Ventic Pro V20A integration configuration looks ready.");
