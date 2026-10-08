"use client";

import { useEffect } from "react";

const COOKIE_NAME = "ventic_attribution";

function clean(value: string | null) {
  return String(value || "")
    .trim()
    .slice(0, 120);
}

export default function MarketingAttribution() {
  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );

    const data = {
      source:
        clean(params.get("source")) ||
        clean(params.get("utm_source")),
      medium: clean(
        params.get("utm_medium"),
      ),
      campaign: clean(
        params.get("utm_campaign"),
      ),
      content: clean(
        params.get("utm_content"),
      ),
      term: clean(params.get("utm_term")),
      ref: clean(params.get("ref")),
      landing: clean(
        window.location.pathname,
      ),
    };

    const useful = Object.values(
      data,
    ).some(Boolean);

    if (!useful) return;

    const value =
      encodeURIComponent(
        JSON.stringify(data),
      );

    document.cookie =
      `${COOKIE_NAME}=${value}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax; Secure`;
  }, []);

  return null;
}
