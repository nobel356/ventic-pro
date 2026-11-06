import {
  analyticsConsentGranted,
  anyTrackingConsentGranted,
  marketingConsentGranted,
} from "@/lib/privacy-consent";

export type ConversionEvent =
  | "page_view"
  | "order_intent"
  | "order_started"
  | "order_submitted"
  | "callback_intent"
  | "callback_submitted"
  | "whatsapp_click"
  | "calculator_view"
  | "calculator_estimate"
  | "works_play"
  | "works_cta"
  | "offer_view"
  | "referral_visit";

type ConversionDetailValue =
  | string
  | number
  | boolean
  | null
  | undefined;

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: any[]) => void;
  }
}

const gtmConfigured = Boolean(
  String(process.env.NEXT_PUBLIC_GTM_ID || "").trim(),
);

function sessionId() {
  if (typeof window === "undefined") return "";

  const key = "ventic_conversion_session";
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;

  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  window.sessionStorage.setItem(key, created);
  return created;
}

function safeDetail(
  detail: Record<string, ConversionDetailValue>,
) {
  return Object.fromEntries(
    Object.entries(detail).filter(([, value]) => value !== undefined),
  );
}

function tiktokEventFor(
  event: ConversionEvent,
  detail: Record<string, ConversionDetailValue>,
) {
  if (
    event === "order_intent" ||
    event === "order_started"
  ) {
    return "InitiateCheckout";
  }

  if (
    event === "callback_submitted" ||
    event === "order_submitted"
  ) {
    return "Lead";
  }

  if (
    event === "whatsapp_click"
  ) {
    return "Contact";
  }

  if (
    event === "works_play" ||
    event === "works_cta" ||
    event === "offer_view" ||
    event === "calculator_estimate"
  ) {
    return "ViewContent";
  }

  if (event === "page_view") {
    const path =
      typeof window !== "undefined"
        ? window.location.pathname
        : "";

    if (
      path.startsWith("/services/") ||
      path.startsWith("/works") ||
      path.startsWith("/offers") ||
      path.startsWith("/why-ventic")
    ) {
      return "ViewContent";
    }
  }

  return null;
}

function tiktokPayload(
  event: ConversionEvent,
  detail: Record<string, ConversionDetailValue>,
) {
  const standardEvent =
    tiktokEventFor(
      event,
      detail,
    );

  if (!standardEvent) {
    return null;
  }

  const rawValue =
    typeof detail.value === "number"
      ? detail.value
      : typeof detail.low === "number"
        ? detail.low
        : undefined;

  return {
    event:
      "ventic_tiktok_conversion",
    tiktok_event:
      standardEvent,
    ventic_event:
      event,
    page_path:
      window.location.pathname,
    currency:
      typeof detail.currency === "string"
        ? detail.currency
        : rawValue !== undefined
          ? "EGP"
          : undefined,
    value:
      rawValue,
    content_type:
      "service",
    service:
      typeof detail.service === "string"
        ? detail.service
        : undefined,
    section:
      typeof detail.section === "string"
        ? detail.section
        : undefined,
  };
}

function pushExternal(
  event: ConversionEvent,
  detail: Record<string, ConversionDetailValue>,
) {
  if (!anyTrackingConsentGranted()) return;

  const payload = {
    event: `ventic_${event}`,
    ventic_event: event,
    page_path: window.location.pathname,
    marketing_allowed:
      marketingConsentGranted(),
    ...safeDetail(detail),
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (
    marketingConsentGranted()
  ) {
    const tiktokPayloadValue =
      tiktokPayload(
        event,
        detail,
      );

    if (tiktokPayloadValue) {
      window.dataLayer.push(
        tiktokPayloadValue,
      );
    }
  }

  // GTM is the single external analytics path when configured.
  // Direct gtag() remains only as a fallback for installations without GTM.
  if (
    !gtmConfigured &&
    analyticsConsentGranted() &&
    window.gtag
  ) {
    window.gtag("event", event, {
      page_path: window.location.pathname,
      ...safeDetail(detail),
    });
  }
}

export function trackConversion(
  event: ConversionEvent,
  detail: Record<string, ConversionDetailValue> = {},
) {
  if (typeof window === "undefined") return;

  pushExternal(event, detail);

  if (!analyticsConsentGranted()) return;

  const payload = JSON.stringify({
    event,
    path: window.location.pathname,
    sessionId: sessionId(),
    detail: safeDetail(detail),
  });

  void fetch("/api/marketing/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: payload,
    keepalive: true,
  }).catch(() => undefined);
}
