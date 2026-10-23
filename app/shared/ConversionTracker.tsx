"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import {
  trackConversion,
  type ConversionEvent,
} from "@/lib/client-conversion";

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
    if (
      pathname.startsWith("/admin") ||
      pathname.startsWith("/technician") ||
      pathname.startsWith("/customer/account")
    ) {
      return;
    }

    const shouldTrack =
      pathname === "/" ||
      trackablePrefixes.some((prefix) => pathname.startsWith(prefix));

    if (!shouldTrack) return;

    const key = `ventic_seen:${pathname}`;
    if (window.sessionStorage.getItem(key)) return;

    window.sessionStorage.setItem(key, "1");
    trackConversion("page_view", {
      section: pathname.split("/").filter(Boolean)[0] || "home",
    });
  }, [pathname]);

  useEffect(() => {
    function handleClick(event: MouseEvent) {
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

      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
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
