"use client";

import { useEffect } from "react";

const STORAGE_KEY = "vp_blog_session";

function getSessionId() {
  try {
    const existing = sessionStorage.getItem(STORAGE_KEY);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(STORAGE_KEY, next);
    return next;
  } catch {
    return "session-unavailable";
  }
}

function send(slug: string, eventType: string, target?: string) {
  const body = JSON.stringify({
    slug,
    eventType,
    target: target || null,
    sessionId: getSessionId(),
  });

  if (navigator.sendBeacon) {
    navigator.sendBeacon(
      "/api/blog/analytics",
      new Blob([body], { type: "application/json" }),
    );
    return;
  }

  void fetch("/api/blog/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  });
}

export default function BlogAnalyticsTracker({ slug }: { slug: string }) {
  useEffect(() => {
    send(slug, "PAGE_VIEW");

    const onClick = (event: MouseEvent) => {
      const element = (event.target as HTMLElement | null)?.closest<HTMLElement>(
        "[data-blog-event]",
      );
      if (!element) return;

      const eventType = element.getAttribute("data-blog-event") || "";
      if (!eventType) return;

      send(
        slug,
        eventType,
        element.getAttribute("data-blog-target") || undefined,
      );
    };

    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [slug]);

  return null;
}
