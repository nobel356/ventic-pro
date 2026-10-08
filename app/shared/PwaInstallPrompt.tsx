"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
};

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] =
    useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((error) => {
          console.warn(
            "[PWA] service worker registration failed",
            error?.message || error,
          );
        });
    }

    const installed =
      window.matchMedia(
        "(display-mode: standalone)",
      ).matches;

    if (installed) return;

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(
        event as InstallPromptEvent,
      );
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener(
      "beforeinstallprompt",
      onPrompt,
    );
    window.addEventListener(
      "appinstalled",
      onInstalled,
    );

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        onPrompt,
      );
      window.removeEventListener(
        "appinstalled",
        onInstalled,
      );
    };
  }, []);

  if (!visible || !promptEvent) {
    return null;
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        left: 14,
        bottom: 14,
        zIndex: 1500,
        maxWidth: 340,
        background: "white",
        border: "1px solid #dbeafe",
        borderRadius: 16,
        boxShadow:
          "0 14px 35px rgba(15,23,42,.18)",
        padding: 14,
      }}
    >
      <strong
        style={{
          display: "block",
          color: "#0f2d4a",
        }}
      >
        ثبّت Ventic Pro على الموبايل
      </strong>
      <small
        style={{
          color: "#64748b",
          lineHeight: 1.7,
        }}
      >
        افتح الطلبات والمتابعة بسرعة كأنه تطبيق.
      </small>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 10,
        }}
      >
        <button
          type="button"
          onClick={async () => {
            await promptEvent.prompt();
            const choice =
              await promptEvent.userChoice;
            if (
              choice.outcome ===
              "accepted"
            ) {
              setVisible(false);
            }
          }}
          style={{
            border: 0,
            borderRadius: 9,
            background: "#f97316",
            color: "white",
            padding: "8px 12px",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          تثبيت
        </button>
        <button
          type="button"
          onClick={() =>
            setVisible(false)
          }
          style={{
            border: "1px solid #cbd5e1",
            borderRadius: 9,
            background: "white",
            color: "#475569",
            padding: "8px 12px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          لاحقًا
        </button>
      </div>
    </div>
  );
}
