"use client";

import { useEffect } from "react";
import { trackConversion } from "@/lib/client-conversion";

export default function OfferImpressionTracker() {
  useEffect(() => {
    const elements =
      Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-offer-code]",
        ),
      );

    if (
      elements.length === 0
    ) {
      return;
    }

    function record(
      element: HTMLElement,
    ) {
      const code =
        element.dataset
          .offerCode;

      if (!code) return;

      const key =
        `ventic_offer_seen:${code}`;

      try {
        if (
          window.sessionStorage.getItem(
            key,
          )
        ) {
          return;
        }

        window.sessionStorage.setItem(
          key,
          "1",
        );
      } catch {
        // Tracking must not block rendering.
      }

      trackConversion(
        "offer_view",
        { code },
      );
    }

    if (
      typeof IntersectionObserver ===
      "undefined"
    ) {
      elements.forEach(
        record,
      );
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (
              !entry.isIntersecting ||
              entry.intersectionRatio <
                0.35
            ) {
              continue;
            }

            const element =
              entry.target as HTMLElement;

            record(element);
            observer.unobserve(
              element,
            );
          }
        },
        {
          threshold: [
            0.35,
          ],
        },
      );

    elements.forEach(
      (element) =>
        observer.observe(
          element,
        ),
    );

    return () =>
      observer.disconnect();
  }, []);

  return null;
}
