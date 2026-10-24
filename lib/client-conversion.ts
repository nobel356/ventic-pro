import {
  analyticsConsentGranted,
  anyTrackingConsentGranted,
} from "@/lib/privacy-consent";

export type ConversionEvent =
  | "page_view"
  | "order_intent"
  | "callback_intent"
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

function pushExternal(
  event: ConversionEvent,
  detail: Record<string, ConversionDetailValue>,
) {
  if (!anyTrackingConsentGranted()) return;

  const payload = {
    event: `ventic_${event}`,
    ventic_event: event,
    page_path: window.location.pathname,
    ...safeDetail(detail),
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  if (analyticsConsentGranted() && window.gtag) {
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
