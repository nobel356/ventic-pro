import {
  marketingConsentGranted,
} from "@/lib/privacy-consent";

export type TikTokStandardEvent =
  | "ViewContent"
  | "InitiateCheckout"
  | "Contact"
  | "Lead";

type TikTokParams = Record<
  string,
  string | number | boolean | undefined
>;

const PIXEL_ID =
  String(
    process.env
      .NEXT_PUBLIC_TIKTOK_PIXEL_ID ||
      "DBN2T3RC77U1OI24UU80",
  ).trim();

declare global {
  interface Window {
    TiktokAnalyticsObject?: string;
    ttq?: any;
  }
}

function bootstrapQueue() {
  if (
    typeof window ===
    "undefined"
  ) {
    return null;
  }

  if (window.ttq) {
    return window.ttq;
  }

  const w = window as any;
  const t = "ttq";

  w.TiktokAnalyticsObject = t;

  const ttq =
    (w[t] = w[t] || []);

  ttq.methods = [
    "page",
    "track",
    "identify",
    "instances",
    "debug",
    "on",
    "off",
    "once",
    "ready",
    "alias",
    "group",
    "enableCookie",
    "disableCookie",
    "holdConsent",
    "revokeConsent",
    "grantConsent",
  ];

  ttq.setAndDefer = function (
    target: any,
    method: string,
  ) {
    target[method] =
      function (...args: any[]) {
        target.push([
          method,
          ...args,
        ]);
      };
  };

  for (
    let i = 0;
    i < ttq.methods.length;
    i += 1
  ) {
    ttq.setAndDefer(
      ttq,
      ttq.methods[i],
    );
  }

  ttq.instance = function (
    id: string,
  ) {
    const instance =
      ttq._i?.[id] || [];

    for (
      let i = 0;
      i < ttq.methods.length;
      i += 1
    ) {
      ttq.setAndDefer(
        instance,
        ttq.methods[i],
      );
    }

    return instance;
  };

  ttq.load = function (
    id: string,
    options?: Record<
      string,
      unknown
    >,
  ) {
    const src =
      "https://analytics.tiktok.com/i18n/pixel/events.js";

    ttq._i =
      ttq._i || {};
    ttq._i[id] = [];
    ttq._i[id]._u = src;

    ttq._t =
      ttq._t || {};
    ttq._t[id] =
      +new Date();

    ttq._o =
      ttq._o || {};
    ttq._o[id] =
      options || {};

    const script =
      document.createElement(
        "script",
      );
    script.type =
      "text/javascript";
    script.async = true;
    script.src =
      `${src}?sdkid=${encodeURIComponent(
        id,
      )}&lib=${t}`;
    script.id =
      "ventic-tiktok-pixel";

    const firstScript =
      document.getElementsByTagName(
        "script",
      )[0];

    if (
      firstScript?.parentNode
    ) {
      firstScript.parentNode.insertBefore(
        script,
        firstScript,
      );
    } else {
      document.head.appendChild(
        script,
      );
    }
  };

  return ttq;
}

export function ensureTikTokPixel() {
  if (
    typeof window ===
      "undefined" ||
    !PIXEL_ID ||
    !marketingConsentGranted()
  ) {
    return false;
  }

  const ttq =
    bootstrapQueue();

  if (!ttq) {
    return false;
  }

  if (
    !document.getElementById(
      "ventic-tiktok-pixel",
    )
  ) {
    ttq.load(
      PIXEL_ID,
    );
  }

  return true;
}

export function grantTikTokConsent() {
  if (!ensureTikTokPixel()) {
    return;
  }

  window.ttq?.grantConsent?.();
}

export function revokeTikTokConsent() {
  if (
    typeof window ===
      "undefined"
  ) {
    return;
  }

  window.ttq?.revokeConsent?.();
}

export function trackTikTokPage() {
  if (!ensureTikTokPixel()) {
    return;
  }

  window.ttq?.page?.();
}

export function trackTikTokStandardEvent(
  event:
    TikTokStandardEvent,
  params: TikTokParams = {},
) {
  if (!ensureTikTokPixel()) {
    return;
  }

  const clean =
    Object.fromEntries(
      Object.entries(
        params,
      ).filter(
        ([, value]) =>
          value !== undefined,
      ),
    );

  window.ttq?.track?.(
    event,
    clean,
  );
}
