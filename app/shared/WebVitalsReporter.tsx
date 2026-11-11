"use client";

import { useEffect } from "react";
import { analyticsConsentGranted } from "@/lib/privacy-consent";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
  }
}

type MetricRating = "good" | "needs-improvement" | "poor";

function ratingFor(
  name: string,
  value: number,
): MetricRating | undefined {
  if (name === "LCP") {
    if (value <= 2500) return "good";
    if (value <= 4000) return "needs-improvement";
    return "poor";
  }

  if (name === "CLS") {
    if (value <= 0.1) return "good";
    if (value <= 0.25) return "needs-improvement";
    return "poor";
  }

  if (name === "INP") {
    if (value <= 200) return "good";
    if (value <= 500) return "needs-improvement";
    return "poor";
  }

  if (name === "FCP") {
    if (value <= 1800) return "good";
    if (value <= 3000) return "needs-improvement";
    return "poor";
  }

  return undefined;
}

function sendMetric(
  name: string,
  value: number,
  detail: Record<string, string | number | boolean | null> = {},
) {
  if (
    typeof window === "undefined" ||
    !analyticsConsentGranted() ||
    !Number.isFinite(value)
  ) {
    return;
  }

  const rating = ratingFor(name, value);
  const rounded =
    name === "CLS"
      ? Number(value.toFixed(4))
      : Math.round(value);

  const payload = {
    event: "ventic_web_vital",
    ventic_event: "web_vital",
    metric_name: name,
    metric_value: rounded,
    metric_rating: rating,
    page_path: window.location.pathname,
    ...detail,
  };

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(payload);

  const body = JSON.stringify({
    event: "web_vital",
    path: window.location.pathname,
    sessionId: "web-vitals",
    detail: {
      name,
      value: rounded,
      rating: rating || null,
      ...detail,
    },
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/marketing/events",
      new Blob([body], {
        type: "application/json",
      }),
    );
    return;
  }

  void fetch("/api/marketing/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

export default function WebVitalsReporter() {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("PerformanceObserver" in window)
    ) {
      return;
    }

    const observers: PerformanceObserver[] = [];
    let clsValue = 0;
    let inpValue = 0;

    function createObserver(
      type: string,
      callback: (entries: PerformanceEntry[]) => void,
      options: Record<string, unknown> = {},
    ) {
      try {
        const observer = new PerformanceObserver((list) => {
          callback(list.getEntries());
        });

        observer.observe({
          type,
          buffered: true,
          ...options,
        } as PerformanceObserverInit);

        observers.push(observer);
      } catch {
        // Unsupported entry type/browser: do not block the site.
      }
    }

    createObserver(
      "largest-contentful-paint",
      (entries) => {
        const last = entries.at(-1);
        if (last) {
          sendMetric("LCP", last.startTime);
        }
      },
    );

    createObserver(
      "layout-shift",
      (entries) => {
        for (const entry of entries) {
          const shift = entry as PerformanceEntry & {
            value?: number;
            hadRecentInput?: boolean;
          };

          if (!shift.hadRecentInput) {
            clsValue += Number(shift.value || 0);
          }
        }
      },
    );

    createObserver(
      "event",
      (entries) => {
        for (const entry of entries) {
          const eventEntry = entry as PerformanceEntry & {
            duration?: number;
            interactionId?: number;
          };

          if (
            Number(eventEntry.interactionId || 0) > 0 &&
            Number(eventEntry.duration || 0) > inpValue
          ) {
            inpValue = Number(eventEntry.duration || 0);
          }
        }
      },
      {
        durationThreshold: 40,
      },
    );

    createObserver(
      "paint",
      (entries) => {
        const fcp = entries.find(
          (entry) =>
            entry.name === "first-contentful-paint",
        );

        if (fcp) {
          sendMetric("FCP", fcp.startTime);
        }
      },
    );

    const flush = () => {
      if (clsValue > 0) {
        sendMetric("CLS", clsValue);
      }

      if (inpValue > 0) {
        sendMetric("INP", inpValue);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flush();
      }
    };

    window.addEventListener("pagehide", flush);
    document.addEventListener(
      "visibilitychange",
      onVisibilityChange,
    );

    return () => {
      flush();

      for (const observer of observers) {
        observer.disconnect();
      }

      window.removeEventListener("pagehide", flush);
      document.removeEventListener(
        "visibilitychange",
        onVisibilityChange,
      );
    };
  }, []);

  return null;
}
