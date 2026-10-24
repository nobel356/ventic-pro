"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  readConsent,
  writeConsent,
  VENTIC_CONSENT_EVENT,
  type VenticConsent,
} from "@/lib/privacy-consent";

declare global {
  interface Window {
    dataLayer?: Array<Record<string, unknown>>;
    gtag?: (...args: any[]) => void;
    clarity?: (...args: any[]) => void;
  }
}

const gtmId = String(
  process.env.NEXT_PUBLIC_GTM_ID || "",
).trim();

const gaMeasurementId = String(
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "",
).trim();

const clarityProjectId = String(
  process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || "",
).trim();

function appendScript(id: string, src: string) {
  if (document.getElementById(id)) return;

  const script = document.createElement("script");
  script.id = id;
  script.async = true;
  script.src = src;
  document.head.appendChild(script);
}

function ensureDataLayer() {
  window.dataLayer = window.dataLayer || [];
  return window.dataLayer;
}

function ensureGoogleQueue() {
  ensureDataLayer();

  if (!window.gtag) {
    window.gtag = (...args: any[]) => {
      (window.dataLayer as any[]).push(args);
    };
  }

  return window.gtag;
}

function loadGtm() {
  if (!gtmId) return;

  const layer = ensureDataLayer();
  const gtag = ensureGoogleQueue();

  if (!document.getElementById("ventic-gtm")) {
    gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });

    layer.push({
      "gtm.start": Date.now(),
      event: "gtm.js",
    });

    appendScript(
      "ventic-gtm",
      `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(gtmId)}`,
    );
  }
}

function loadDirectGa() {
  if (!gaMeasurementId || gtmId) return;

  appendScript(
    "ventic-ga4",
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(
      gaMeasurementId,
    )}`,
  );

  const gtag = ensureGoogleQueue();

  gtag("consent", "default", {
    analytics_storage: "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });

  gtag("js", new Date());
  window.gtag("config", gaMeasurementId, {
    send_page_view: false,
  });
}

function loadClarity() {
  if (!clarityProjectId) return;

  if (!window.clarity) {
    const clarityQueue = ((...args: any[]) => {
      const fn = clarityQueue as any;
      fn.q = fn.q || [];
      fn.q.push(args);
    }) as any;

    window.clarity = clarityQueue;
  }

  if (document.getElementById("ventic-clarity")) return;

  const script = document.createElement("script");
  script.id = "ventic-clarity";
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${encodeURIComponent(
    clarityProjectId,
  )}`;

  document.head.appendChild(script);
}

function pushConsent(consent: VenticConsent) {
  const analyticsState = consent.analytics ? "granted" : "denied";
  const marketingState = consent.marketing ? "granted" : "denied";

  ensureDataLayer().push({
    event: "ventic_consent_update",
    analytics_storage: analyticsState,
    ad_storage: marketingState,
    ad_user_data: marketingState,
    ad_personalization: marketingState,
  });

  if (window.gtag) {
    window.gtag("consent", "update", {
      analytics_storage: analyticsState,
      ad_storage: marketingState,
      ad_user_data: marketingState,
      ad_personalization: marketingState,
    });
  }

  if (window.clarity) {
    window.clarity("consentv2", {
      analytics_Storage: analyticsState,
      ad_Storage: marketingState,
    });
  }
}

function activate(consent: VenticConsent) {
  if (consent.analytics || consent.marketing) {
    loadGtm();
  }

  if (consent.analytics) {
    loadDirectGa();
    loadClarity();
  }

  pushConsent(consent);
}

export default function TrackingManager() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<VenticConsent | null>(null);
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  const dashboard =
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician") ||
    pathname.startsWith("/customer/account");

  useEffect(() => {
    const existing = readConsent();
    setConsent(existing);

    if (existing) {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
      activate(existing);
      return;
    }

    setOpen(true);
  }, []);

  useEffect(() => {
    function onConsent(event: Event) {
      const next =
        (event as CustomEvent<VenticConsent>).detail || readConsent();

      if (!next) return;

      setConsent(next);
      setAnalytics(next.analytics);
      setMarketing(next.marketing);
      activate(next);
    }

    window.addEventListener(VENTIC_CONSENT_EVENT, onConsent);

    return () => {
      window.removeEventListener(VENTIC_CONSENT_EVENT, onConsent);
    };
  }, []);

  const statusLabel = useMemo(() => {
    if (!consent) return "غير محدد";
    if (consent.analytics && consent.marketing) return "الكل";
    if (consent.analytics) return "التحليلات فقط";
    if (consent.marketing) return "التسويق فقط";
    return "الضروري فقط";
  }, [consent]);

  function save(next: { analytics: boolean; marketing: boolean }) {
    writeConsent(next);
    setConsent({
      version: 1,
      analytics: next.analytics,
      marketing: next.marketing,
      updatedAt: Date.now(),
    });
    setOpen(false);
  }

  if (dashboard) return null;

  return (
    <>
      {!open && (
        <button
          type="button"
          className="vpPrivacySettingsButton"
          onClick={() => setOpen(true)}
          aria-label={`إعدادات الخصوصية — ${statusLabel}`}
          title="إعدادات الخصوصية"
        >
          الخصوصية
        </button>
      )}

      {open && (
        <div
          className="vpConsentBackdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="vp-consent-title"
        >
          <section dir="rtl" className="vpConsentCard">
            <span className="vpConsentEyebrow">خصوصيتك</span>
            <h2 id="vp-consent-title">اختار مستوى القياس المناسب لك</h2>

            <p>
              ملفات التشغيل الأساسية تظل فعالة لتشغيل الطلب والحساب. التحليلات
              وقياس الحملات لا يتم تشغيلهما إلا حسب اختيارك.
            </p>

            <label className="vpConsentOption">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
              />
              <span>
                <strong>تحليلات الأداء</strong>
                <small>
                  قياس الصفحات والتحويلات وتحسين تجربة الموقع، بما في ذلك
                  Google Analytics أو Microsoft Clarity عند تفعيلهما.
                </small>
              </span>
            </label>

            <label className="vpConsentOption">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(event) => setMarketing(event.target.checked)}
              />
              <span>
                <strong>قياس الحملات الإعلانية</strong>
                <small>
                  يسمح بتشغيل Tags التسويق مثل Meta وTikTok من خلال Google Tag
                  Manager بعد إعداد الحسابات.
                </small>
              </span>
            </label>

            <div className="vpConsentActions">
              <button
                type="button"
                className="vpConsentPrimary"
                onClick={() => save({ analytics: true, marketing: true })}
              >
                قبول الكل
              </button>

              <button
                type="button"
                className="vpConsentSecondary"
                onClick={() => save({ analytics, marketing })}
              >
                حفظ اختياراتي
              </button>

              <button
                type="button"
                className="vpConsentLink"
                onClick={() => save({ analytics: false, marketing: false })}
              >
                الضروري فقط
              </button>
            </div>

            <a className="vpConsentPolicy" href="/legal/privacy">
              قراءة سياسة الخصوصية
            </a>
          </section>
        </div>
      )}

      <style>{`
        .vpPrivacySettingsButton{
          position:fixed;
          right:14px;
          bottom:max(82px,calc(env(safe-area-inset-bottom) + 76px));
          z-index:2350;
          min-height:34px;
          padding:0 10px;
          border:1px solid rgba(15,47,73,.16);
          border-radius:999px;
          background:rgba(255,255,255,.93);
          color:#475569;
          font:inherit;
          font-size:11px;
          font-weight:900;
          cursor:pointer;
          box-shadow:0 8px 22px rgba(7,26,43,.10);
          backdrop-filter:blur(10px);
        }
        .vpConsentBackdrop{
          position:fixed;
          inset:0;
          z-index:8000;
          display:grid;
          place-items:end center;
          padding:18px;
          background:rgba(7,26,43,.50);
          backdrop-filter:blur(4px);
        }
        .vpConsentCard{
          width:min(680px,100%);
          max-height:90dvh;
          overflow:auto;
          background:white;
          border:1px solid #dbe7ef;
          border-radius:22px;
          padding:20px;
          box-shadow:0 24px 70px rgba(7,26,43,.28);
        }
        .vpConsentEyebrow{
          color:#0284c7;
          font-size:12px;
          font-weight:900;
        }
        .vpConsentCard h2{
          color:#071a2b;
          margin:5px 0 8px;
        }
        .vpConsentCard>p{
          color:#64748b;
          line-height:1.8;
          margin-top:0;
        }
        .vpConsentOption{
          display:flex;
          gap:10px;
          align-items:flex-start;
          margin-top:10px;
          padding:13px;
          border:1px solid #e2e8f0;
          border-radius:13px;
          cursor:pointer;
        }
        .vpConsentOption input{
          margin-top:4px;
          width:18px;
          height:18px;
        }
        .vpConsentOption span{
          display:grid;
          gap:3px;
        }
        .vpConsentOption strong{
          color:#0b2f49;
        }
        .vpConsentOption small{
          color:#64748b;
          line-height:1.7;
        }
        .vpConsentActions{
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:16px;
        }
        .vpConsentActions button{
          min-height:43px;
          border-radius:10px;
          padding:0 13px;
          font:inherit;
          font-weight:900;
          cursor:pointer;
        }
        .vpConsentPrimary{
          border:0;
          background:#0a84ff;
          color:white;
        }
        .vpConsentSecondary{
          border:1px solid #bae6fd;
          background:#f0f9ff;
          color:#075985;
        }
        .vpConsentLink{
          border:1px solid #cbd5e1;
          background:white;
          color:#475569;
        }
        .vpConsentPolicy{
          display:inline-block;
          margin-top:13px;
          color:#075985;
          font-size:12px;
          font-weight:900;
        }
      `}</style>
    </>
  );
}
