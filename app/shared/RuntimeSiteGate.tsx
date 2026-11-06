"use client";

import {
  FormEvent,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import {
  enqueueRuntimePendingLead,
  readRuntimePendingLeads,
  writeRuntimePendingLeads,
} from "@/lib/runtime-lead-queue";

type RuntimeControl = {
  mode: "NORMAL" | "LEAD_ONLY" | "MAINTENANCE";
  leadCapture: boolean;
  fallbackWhatsapp: string;
  supportPhone: string;
  maintenanceMessage: string;
  leadSuccessMessage: string;
};

const FAIL_SAFE: RuntimeControl = {
  mode: "LEAD_ONLY",
  leadCapture: true,
  fallbackWhatsapp: "201044226423",
  supportPhone: "01044226423",
  maintenanceMessage:
    "الخدمة الكاملة متوقفة مؤقتًا، لكن سيب اسمك ورقمك وفريق Ventic Pro هيتواصل معاك.",
  leadSuccessMessage:
    "تم تسجيل بياناتك، وفريق Ventic Pro هيتواصل معاك.",
};

function bypass(pathname: string) {
  return (
    pathname === "/login" ||
    pathname === "/callback" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/technician")
  );
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export default function RuntimeSiteGate({
  children,
  initialRuntime = null,
  hardLocked = false,
}: {
  children: ReactNode;
  initialRuntime?: RuntimeControl | null;
  hardLocked?: boolean;
}) {
  const pathname = usePathname() || "/";
  const [runtime, setRuntime] =
    useState<RuntimeControl | null>(
      initialRuntime,
    );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [sending, setSending] =
    useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] =
    useState("");

  const skipped = bypass(pathname);
  const normalizedPhone =
    useMemo(
      () => normalizePhone(phone),
      [phone],
    );

  useEffect(() => {
    if (skipped) return;

    let cancelled = false;

    async function load() {
      try {
        const response = await fetch(
          "/api/runtime",
          { cache: "no-store" },
        );
        if (!response.ok) {
          throw new Error(
            "runtime unavailable",
          );
        }
        const data =
          await response.json();

        if (cancelled) {
          return;
        }

        if (
          hardLocked &&
          data?.mode === "NORMAL"
        ) {
          window.location.reload();
          return;
        }

        setRuntime(data);
      } catch {
        if (!cancelled) {
          setRuntime(
            hardLocked
              ? initialRuntime ||
                  FAIL_SAFE
              : FAIL_SAFE,
          );
        }
      }
    }

    void load();

    const timer =
      window.setInterval(
        () => void load(),
        4000,
      );

    const onVisible = () => {
      if (
        document.visibilityState ===
        "visible"
      ) {
        void load();
      }
    };

    document.addEventListener(
      "visibilitychange",
      onVisible,
    );

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener(
        "visibilitychange",
        onVisible,
      );
    };
  }, [
    hardLocked,
    initialRuntime,
    pathname,
    skipped,
  ]);

  useEffect(() => {
    if (
      skipped ||
      !runtime?.leadCapture
    ) {
      return;
    }

    async function syncPending() {
      try {
        const pending =
          readRuntimePendingLeads(
            localStorage,
          );

        const remaining = [];

        for (const item of pending) {
          try {
            const response =
              await fetch(
                "/api/leads",
                {
                  method: "POST",
                  headers: {
                    "Content-Type":
                      "application/json",
                  },
                  body:
                    JSON.stringify(
                      item,
                    ),
                },
              );
            if (!response.ok) {
              remaining.push(item);
            }
          } catch {
            remaining.push(item);
          }
        }

        writeRuntimePendingLeads(
          localStorage,
          remaining,
        );
      } catch {
        // Fallback must never break the page.
      }
    }

    void syncPending();
  }, [runtime, skipped]);

  const whatsappHref =
    useMemo(() => {
      const number =
        runtime?.fallbackWhatsapp ||
        FAIL_SAFE.fallbackWhatsapp;
      const text =
        name.trim() &&
        /^01\d{9}$/.test(
          normalizedPhone,
        )
          ? `مرحبًا Ventic Pro، اسمي ${name.trim()} ورقمي ${normalizedPhone} وأريد طلب خدمة.`
          : "مرحبًا Ventic Pro، أريد طلب خدمة.";
      return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    }, [
      name,
      normalizedPhone,
      runtime,
    ]);

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      setMessage("اكتب اسمك.");
      return;
    }

    if (
      !/^01\d{9}$/.test(
        normalizedPhone,
      )
    ) {
      setMessage(
        "اكتب رقم موبايل مصري صحيح من 11 رقم.",
      );
      return;
    }

    const payload = {
      name: name.trim(),
      phone: normalizedPhone,
      currentStep: 1,
      consentToFollowUp: true,
      source: "RUNTIME_FALLBACK",
      payload: {
        requestType:
          "QUICK_REQUEST",
        intent:
          runtime?.mode ===
          "MAINTENANCE"
            ? "MAINTENANCE_CONTACT"
            : "LEAD_ONLY_CONTACT",
        entryPoint:
          "RUNTIME_SITE_GATE",
      },
    };

    setSending(true);
    setMessage("");

    try {
      const response =
        await fetch(
          "/api/leads",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify(
                payload,
              ),
          },
        );

      const data =
        await response
          .json()
          .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر الحفظ على السيرفر.",
        );
      }

      setSaved(true);
      setMessage(
        runtime?.leadSuccessMessage ||
          FAIL_SAFE.leadSuccessMessage,
      );
    } catch (error: any) {
      try {
        enqueueRuntimePendingLead(
          localStorage,
          {
            ...payload,
            payload: {
              ...payload.payload,
              localFallback: true,
              capturedAt:
                new Date().toISOString(),
            },
          },
        );

        setSaved(true);
        setMessage(
          "حفظنا بياناتك مؤقتًا على جهازك. استخدم واتساب أو الاتصال الآن لضمان وصول طلبك.",
        );
      } catch {
        setMessage(
          error?.message ||
            "تعذر الحفظ. استخدم واتساب أو الاتصال مباشرة.",
        );
      }
    } finally {
      setSending(false);
    }
  }

  if (
    skipped ||
    !runtime ||
    runtime.mode === "NORMAL"
  ) {
    return <>{children}</>;
  }

  const maintenance =
    runtime.mode ===
    "MAINTENANCE";

  return (
    <main dir="rtl" style={screen}>
      <section style={panel}>
        <div style={logo}>V</div>

        <div
          style={{
            ...badge,
            background:
              maintenance
                ? "#fff7ed"
                : "#eff6ff",
            borderColor:
              maintenance
                ? "#fdba74"
                : "#93c5fd",
            color:
              maintenance
                ? "#9a3412"
                : "#1d4ed8",
          }}
        >
          {maintenance
            ? "● الموقع تحت الصيانة"
            : "● وضع التواصل السريع"}
        </div>

        <h1 style={title}>
          {maintenance
            ? "Ventic Pro تحت الصيانة مؤقتًا"
            : "سيب بياناتك وإحنا هنتواصل معاك"}
        </h1>

        <p style={muted}>
          {maintenance
            ? runtime.maintenanceMessage
            : "الخدمات التفصيلية متوقفة مؤقتًا، لكن تقدر تسجل اسمك ورقمك وفريق Ventic Pro هيتواصل معاك."}
        </p>

        {runtime.leadCapture ? (
          <form
            onSubmit={submit}
            style={form}
          >
            <label style={label}>
              الاسم
              <input
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value,
                  )
                }
                disabled={
                  sending || saved
                }
                placeholder="اسمك"
                style={input}
              />
            </label>

            <label style={label}>
              رقم الموبايل
              <input
                value={phone}
                onChange={(e) =>
                  setPhone(
                    e.target.value,
                  )
                }
                disabled={
                  sending || saved
                }
                placeholder="01xxxxxxxxx"
                inputMode="tel"
                style={input}
              />
            </label>

            <button
              type="submit"
              disabled={
                sending || saved
              }
              style={primary}
            >
              {sending
                ? "جاري التسجيل..."
                : saved
                  ? "تم التسجيل ✓"
                  : "سجّل بياناتي"}
            </button>
          </form>
        ) : null}

        {message ? (
          <div style={notice}>
            {message}
          </div>
        ) : null}

        <div style={actions}>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            style={secondary}
          >
            واتساب مباشر
          </a>
          <a
            href={`tel:${runtime.supportPhone}`}
            style={secondary}
          >
            اتصال مباشر
          </a>
        </div>
      </section>
    </main>
  );
}

const screen: React.CSSProperties = {
  minHeight: "100dvh",
  display: "grid",
  placeItems: "center",
  padding: 20,
  background:
    "linear-gradient(145deg,#eef6fb,#f8fafc 55%,#ecfeff)",
};

const panel: React.CSSProperties = {
  width: "100%",
  maxWidth: 560,
  boxSizing: "border-box",
  background: "white",
  border:
    "1px solid #dbe4ea",
  borderRadius: 24,
  padding: 28,
  boxShadow:
    "0 24px 70px rgba(15,23,42,.12)",
  textAlign: "center",
};

const logo: React.CSSProperties = {
  width: 64,
  height: 64,
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  margin: "0 auto 14px",
  background: "#0b2f49",
  color: "white",
  fontSize: 32,
  fontWeight: 900,
};

const badge: React.CSSProperties = {
  display: "inline-flex",
  border: "1px solid",
  borderRadius: 999,
  padding: "6px 12px",
  fontSize: 13,
  fontWeight: 900,
  marginBottom: 14,
};

const title: React.CSSProperties = {
  margin: "0 0 10px",
  color: "#0b2f49",
};

const muted: React.CSSProperties = {
  margin: "0 auto 20px",
  maxWidth: 460,
  color: "#64748b",
  lineHeight: 1.9,
};

const form: React.CSSProperties = {
  display: "grid",
  gap: 12,
  textAlign: "right",
};

const label: React.CSSProperties = {
  display: "grid",
  gap: 6,
  color: "#334155",
  fontWeight: 800,
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border:
    "1px solid #cbd5e1",
  borderRadius: 13,
  padding: "12px 14px",
  font: "inherit",
};

const primary: React.CSSProperties = {
  border: 0,
  borderRadius: 13,
  padding: "13px 16px",
  background: "#0b2f49",
  color: "white",
  font: "inherit",
  fontWeight: 900,
  cursor: "pointer",
};

const actions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(2,minmax(0,1fr))",
  gap: 10,
  marginTop: 14,
};

const secondary: React.CSSProperties = {
  display: "block",
  border:
    "1px solid #cbd5e1",
  borderRadius: 13,
  padding: "11px 12px",
  color: "#0b2f49",
  background: "#f8fafc",
  textDecoration: "none",
  fontWeight: 900,
};

const notice: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 12,
  background: "#ecfdf5",
  color: "#166534",
  border:
    "1px solid #86efac",
};
