import { prisma } from "@/lib/prisma";

export type SiteMode =
  | "NORMAL"
  | "LEAD_ONLY"
  | "MAINTENANCE";

export type RuntimeControl = {
  mode: SiteMode;
  leadCapture: boolean;
  detailedOrders: boolean;
  customerAccounts: boolean;
  accountRegistration: boolean;
  phoneOtp: boolean;
  emailOtpRecovery: boolean;
  estimates: boolean;
  coupons: boolean;
  referrals: boolean;
  uploads: boolean;
  reviews: boolean;
  aftercare: boolean;
  portfolio: boolean;
  notifications: boolean;
  marketingTracking: boolean;
  fallbackWhatsapp: string;
  supportPhone: string;
  maintenanceMessage: string;
  leadSuccessMessage: string;
};

export const RUNTIME_CONTROL_KEY =
  "SITE_CONTROL";

export const DEFAULT_RUNTIME_CONTROL: RuntimeControl = {
  mode: "NORMAL",
  leadCapture: true,
  detailedOrders: true,
  customerAccounts: true,
  accountRegistration: false,
  phoneOtp: false,
  emailOtpRecovery: true,
  estimates: true,
  coupons: true,
  referrals: true,
  uploads: true,
  reviews: true,
  aftercare: true,
  portfolio: true,
  notifications: true,
  marketingTracking: true,
  fallbackWhatsapp: "201044226423",
  supportPhone: "01044226423",
  maintenanceMessage:
    "الخدمة الكاملة متوقفة مؤقتًا، لكن سيب اسمك ورقمك وفريق Ventic Pro هيتواصل معاك.",
  leadSuccessMessage:
    "تم تسجيل بياناتك، وفريق Ventic Pro هيتواصل معاك.",
};

export const DEGRADED_RUNTIME_CONTROL: RuntimeControl = {
  ...DEFAULT_RUNTIME_CONTROL,
  mode: "LEAD_ONLY",
  detailedOrders: false,
  customerAccounts: false,
  accountRegistration: false,
  phoneOtp: false,
  emailOtpRecovery: false,
  estimates: false,
  coupons: false,
  referrals: false,
  uploads: false,
  reviews: false,
  aftercare: false,
  portfolio: false,
  notifications: false,
  marketingTracking: false,
};

function bool(
  value: unknown,
  fallback: boolean,
) {
  return typeof value === "boolean"
    ? value
    : fallback;
}

function text(
  value: unknown,
  fallback: string,
  max = 300,
) {
  const v = String(value ?? "").trim();
  return v
    ? v.slice(0, max)
    : fallback;
}

export function sanitizeRuntimeControl(
  input: unknown,
): RuntimeControl {
  const raw =
    input &&
    typeof input === "object" &&
    !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  const mode: SiteMode =
    raw.mode === "LEAD_ONLY" ||
    raw.mode === "MAINTENANCE"
      ? raw.mode
      : "NORMAL";

  return {
    mode,
    leadCapture: bool(
      raw.leadCapture,
      DEFAULT_RUNTIME_CONTROL.leadCapture,
    ),
    detailedOrders: bool(
      raw.detailedOrders,
      DEFAULT_RUNTIME_CONTROL.detailedOrders,
    ),
    customerAccounts: bool(
      raw.customerAccounts,
      DEFAULT_RUNTIME_CONTROL.customerAccounts,
    ),
    accountRegistration: bool(
      raw.accountRegistration,
      DEFAULT_RUNTIME_CONTROL.accountRegistration,
    ),
    phoneOtp: bool(
      raw.phoneOtp,
      DEFAULT_RUNTIME_CONTROL.phoneOtp,
    ),
    emailOtpRecovery: bool(
      raw.emailOtpRecovery,
      DEFAULT_RUNTIME_CONTROL.emailOtpRecovery,
    ),
    estimates: bool(
      raw.estimates,
      DEFAULT_RUNTIME_CONTROL.estimates,
    ),
    coupons: bool(
      raw.coupons,
      DEFAULT_RUNTIME_CONTROL.coupons,
    ),
    referrals: bool(
      raw.referrals,
      DEFAULT_RUNTIME_CONTROL.referrals,
    ),
    uploads: bool(
      raw.uploads,
      DEFAULT_RUNTIME_CONTROL.uploads,
    ),
    reviews: bool(
      raw.reviews,
      DEFAULT_RUNTIME_CONTROL.reviews,
    ),
    aftercare: bool(
      raw.aftercare,
      DEFAULT_RUNTIME_CONTROL.aftercare,
    ),
    portfolio: bool(
      raw.portfolio,
      DEFAULT_RUNTIME_CONTROL.portfolio,
    ),
    notifications: bool(
      raw.notifications,
      DEFAULT_RUNTIME_CONTROL.notifications,
    ),
    marketingTracking: bool(
      raw.marketingTracking,
      DEFAULT_RUNTIME_CONTROL.marketingTracking,
    ),
    fallbackWhatsapp: text(
      raw.fallbackWhatsapp,
      DEFAULT_RUNTIME_CONTROL.fallbackWhatsapp,
      20,
    ).replace(/\D/g, ""),
    supportPhone: text(
      raw.supportPhone,
      DEFAULT_RUNTIME_CONTROL.supportPhone,
      20,
    ),
    maintenanceMessage: text(
      raw.maintenanceMessage,
      DEFAULT_RUNTIME_CONTROL.maintenanceMessage,
    ),
    leadSuccessMessage: text(
      raw.leadSuccessMessage,
      DEFAULT_RUNTIME_CONTROL.leadSuccessMessage,
    ),
  };
}

export async function getRuntimeControl() {
  try {
    const setting =
      await prisma.runtimeSetting.findUnique({
        where: {
          key: RUNTIME_CONTROL_KEY,
        },
      });

    if (!setting) {
      return {
        control:
          DEFAULT_RUNTIME_CONTROL,
        degraded: false,
      };
    }

    return {
      control:
        sanitizeRuntimeControl(
          setting.value,
        ),
      degraded: false,
    };
  } catch (error) {
    console.error(
      "RUNTIME_CONTROL_DEGRADED",
      error,
    );

    return {
      control:
        DEGRADED_RUNTIME_CONTROL,
      degraded: true,
    };
  }
}

export async function saveRuntimeControl(
  value: RuntimeControl,
  actor: {
    id?: string | null;
    label?: string | null;
  },
) {
  return prisma.runtimeSetting.upsert({
    where: {
      key: RUNTIME_CONTROL_KEY,
    },
    update: {
      value,
      updatedById:
        actor.id || null,
      updatedByLabel:
        actor.label || null,
    },
    create: {
      key: RUNTIME_CONTROL_KEY,
      value,
      updatedById:
        actor.id || null,
      updatedByLabel:
        actor.label || null,
    },
  });
}
