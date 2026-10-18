"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
  }>;
};

const DISMISS_KEY = "ventic_pwa_prompt_dismissed_at";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

function recentlyDismissed() {
  try {
    const value = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return value > 0 && Date.now() - value < SEVEN_DAYS;
  } catch {
    return false;
  }
}

function rememberDismissal() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export default function PwaInstallPrompt() {
  const [promptEvent, setPromptEvent] =
    useState<InstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

    if (standalone || recentlyDismissed()) return;

    const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari =
      /Safari/.test(navigator.userAgent) &&
      !/CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent);

    if (isIos && isSafari) {
      setIos(true);
      const timer = window.setTimeout(() => setVisible(true), 1200);
      return () => window.clearTimeout(timer);
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setPromptEvent(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!visible) return null;

  function dismiss() {
    rememberDismissal();
    setVisible(false);
  }

  return (
    <div
      dir="rtl"
      style={{
        position: "fixed",
        left: "max(14px, env(safe-area-inset-left))",
        right: "max(14px, env(safe-area-inset-right))",
        bottom: "max(14px, calc(env(safe-area-inset-bottom) + 10px))",
        zIndex: 3500,
        width: "auto",
        maxWidth: 430,
        marginInline: "auto",
        background: "white",
        border: "1px solid #cfe3ef",
        borderRadius: 18,
        boxShadow: "0 18px 48px rgba(7,26,43,.22)",
        padding: 15,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 11 }}>
        <div
          style={{
            width: 44,
            height: 44,
            flex: "0 0 44px",
            display: "grid",
            placeItems: "center",
            borderRadius: 12,
            background: "#eaf6ff",
            color: "#0a84ff",
            fontWeight: 950,
            fontSize: 21,
          }}
        >
          V
        </div>

        <div style={{ flex: 1 }}>
          <strong style={{ display: "block", color: "#0b2f49", fontSize: 15 }}>
            {ios
              ? "ضيف Ventic Pro لشاشة iPhone"
              : "ثبّت Ventic Pro على الموبايل"}
          </strong>

          {ios ? (
            <div
              style={{
                color: "#64748b",
                lineHeight: 1.75,
                fontSize: 13,
                marginTop: 5,
              }}
            >
              من Safari اضغط زر المشاركة <b>□↑</b> ثم اختار{" "}
              <b>إضافة إلى الشاشة الرئيسية</b>. بعد كده الموقع هيفتح عندك شبه التطبيق.
            </div>
          ) : (
            <small style={{ color: "#64748b", lineHeight: 1.7 }}>
              افتح الطلبات والمتابعة بسرعة كأنه تطبيق.
            </small>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {!ios && promptEvent && (
          <button
            type="button"
            onClick={async () => {
              await promptEvent.prompt();
              const choice = await promptEvent.userChoice;
              if (choice.outcome === "accepted") setVisible(false);
            }}
            style={{
              minHeight: 44,
              border: 0,
              borderRadius: 10,
              background: "#0a84ff",
              color: "white",
              padding: "9px 15px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            تثبيت
          </button>
        )}

        {ios && (
          <button
            type="button"
            onClick={dismiss}
            style={{
              minHeight: 44,
              border: 0,
              borderRadius: 10,
              background: "#0a84ff",
              color: "white",
              padding: "9px 15px",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            تمام، فهمت
          </button>
        )}

        <button
          type="button"
          onClick={dismiss}
          style={{
            minHeight: 44,
            border: "1px solid #cbd5e1",
            borderRadius: 10,
            background: "white",
            color: "#475569",
            padding: "9px 13px",
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
