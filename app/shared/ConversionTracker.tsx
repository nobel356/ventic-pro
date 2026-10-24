"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  trackConversion,
  type ConversionEvent,
} from "@/lib/client-conversion";
import {
  anyTrackingConsentGranted,
  VENTIC_CONSENT_EVENT,
} from "@/lib/privacy-consent";

const trackablePrefixes = [
  "/services/",
  "/works",
  "/calculator",
  "/offers",
  "/why-ventic",
  "/areas",
  "/callback",
  "/order",
];

export default function ConversionTracker() {
  const pathname = usePathname();

  useEffect(() => {
    function trackPage() {
      if (
        pathname.startsWith("/admin") ||
        pathname.startsWith("/technician") ||
        pathname.startsWith("/customer/account")
      ) {
        return;
      }

      if (!anyTrackingConsentGranted()) return;

      const shouldTrack =
        pathname === "/" ||
        trackablePrefixes.some((prefix) => pathname.startsWith(prefix));

      if (!shouldTrack) return;

      const key = `ventic_seen:${pathname}`;
      if (window.sessionStorage.getItem(key)) return;

      trackConversion("page_view", {
        section: pathname.split("/").filter(Boolean)[0] || "home",
      });

      window.sessionStorage.setItem(key, "1");
    }

    trackPage();

    window.addEventListener(VENTIC_CONSENT_EVENT, trackPage);

    return () => {
      window.removeEventListener(VENTIC_CONSENT_EVENT, trackPage);
    };
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!anyTrackingConsentGranted()) return;

      const element = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-track]",
      );

      if (element) {
        const name = element.dataset.track as ConversionEvent | undefined;
        if (!name) return;

        trackConversion(name, {
          label: element.dataset.trackLabel || null,
        });
        return;
      }

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>(
        "a[href]",
      );
      const href = anchor?.getAttribute("href") || "";

      if (href.startsWith("/order")) {
        trackConversion("order_intent", { label: "auto_link" });
      } else if (href.startsWith("/callback")) {
        trackConversion("callback_intent", { label: "auto_link" });
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
