"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

type ContactDraft = {
  name: string;
  phone: string;
  leadId?: string;
};

const CONTACT_STORAGE_KEY =
  "ventic_order_contact";

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export default function OrderEntryGate({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [mode, setMode] = useState("");
  const [mounted, setMounted] = useState(false);

  const [choice, setChoice] = useState<
    "" | "quick" | "detailed"
  >("");
  const [name, setName] =
    useState("");
  const [phone, setPhone] =
    useState("");
  const [saving, setSaving] =
    useState(false);
  const [error, setError] =
    useState("");
  const [success, setSuccess] =
    useState(false);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search,
      );
    const nextMode =
      params.get("mode") || "";

    setMode(nextMode);

    if (
      nextMode === "full" ||
      nextMode === "quick"
    ) {
      setChoice(
        nextMode === "full"
          ? "detailed"
          : "quick",
      );
    }

    setMounted(true);
  }, []);

  const normalizedPhone =
    useMemo(
      () =>
        normalizePhone(phone),
      [phone],
    );

  const valid =
    name.trim().length >= 2 &&
    /^01\d{9}$/.test(
      normalizedPhone,
    );

  function urlWithMode(
    nextMode: string,
  ) {
    const params =
      new URLSearchParams(
        typeof window === "undefined"
          ? ""
          : window.location.search,
      );
    params.set("mode", nextMode);
    return `/order?${params.toString()}`;
  }

  async function capture(
    requestType:
      | "QUICK_REQUEST"
      | "DETAILED_ENTRY",
  ) {
    if (!valid) {
      setError(
        "اكتب الاسم ورقم موبايل مصري صحيح.",
      );
      return null;
    }

    setSaving(true);
    setError("");

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
              JSON.stringify({
                name:
                  name.trim(),
                phone:
                  normalizedPhone,
                currentStep: 1,
                consentToFollowUp:
                  true,
                payload: {
                  requestType,
                  entryPoint:
                    "ORDER_GATE",
                },
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر إرسال الطلب.",
        );
      }

      const draft: ContactDraft = {
        name: name.trim(),
        phone:
          normalizedPhone,
        leadId:
          data?.id ||
          undefined,
      };

      window.sessionStorage.setItem(
        CONTACT_STORAGE_KEY,
        JSON.stringify(draft),
      );

      return draft;
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إرسال الطلب.",
      );
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function submitQuick() {
    const draft =
      await capture(
        "QUICK_REQUEST",
      );

    if (!draft) return;
    setSuccess(true);
  }

  async function startDetailed() {
    const draft =
      await capture(
        "DETAILED_ENTRY",
      );

    if (!draft) return;

    setMode("full");
    router.replace(
      urlWithMode("full"),
    );
  }

  if (!mounted) {
    return (
      <main className="order" dir="rtl">
        <div className="brand center">
          <i>V</i> Ventic Pro
        </div>
        <section className="panel orderPanel">
          جاري تجهيز الطلب...
        </section>
      </main>
    );
  }

  if (mode === "full") {
    return <>{children}</>;
  }

  if (success) {
    return (
      <main
        className="order"
        dir="rtl"
      >
        <div className="brand center">
          <i>V</i> Ventic Pro
        </div>

        <section
          className="panel orderPanel"
          style={{
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: 62,
              height: 62,
              margin:
                "0 auto 14px",
              borderRadius: 18,
              display: "grid",
              placeItems:
                "center",
              background:
                "#f0fdf4",
              color: "#166534",
              fontSize: 30,
              fontWeight: 900,
            }}
          >
            ✓
          </div>

          <h1>
            وصلنا طلبك
          </h1>

          <p
            style={{
              color: "#64748b",
              lineHeight: 1.9,
            }}
          >
            سجلنا اسمك ورقم
            الموبايل فقط، وفريق
            Ventic Pro هيتواصل
            معاك عشان يعرف
            التفاصيل ويحدد
            الخدمة المناسبة.
          </p>

          <button
            type="button"
            className="button full"
            onClick={() => {
              setSuccess(false);
              setChoice(
                "detailed",
              );
              router.replace(
                urlWithMode(
                  "quick",
                ),
              );
            }}
          >
            أحب أضيف التفاصيل
            بنفسي
          </button>

          <a
            href="/"
            style={{
              display: "block",
              marginTop: 14,
              color: "#64748b",
              fontWeight: 800,
            }}
          >
            الرجوع للرئيسية
          </a>
        </section>
      </main>
    );
  }

  if (
    choice === "quick" ||
    choice === "detailed"
  ) {
    const detailed =
      choice === "detailed";

    return (
      <main
        className="order"
        dir="rtl"
      >
        <div className="brand center">
          <i>V</i> Ventic Pro
        </div>

        <section className="panel orderPanel">
          <button
            type="button"
            className="ghostBtn"
            onClick={() => {
              setChoice("");
              setMode("");
              setError("");
              router.replace(
                "/order",
              );
            }}
            style={{
              marginBottom: 12,
            }}
          >
            ← تغيير الاختيار
          </button>

          <span
            style={{
              display:
                "inline-flex",
              padding:
                "6px 10px",
              borderRadius: 999,
              background:
                detailed
                  ? "#eff6ff"
                  : "#fff7ed",
              color:
                detailed
                  ? "#1d4ed8"
                  : "#c2410c",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            {detailed
              ? "طلب بالتفاصيل"
              : "طلب سريع"}
          </span>

          <h1
            style={{
              marginBottom: 6,
            }}
          >
            {detailed
              ? "نبدأ باسمك ورقمك"
              : "خليها علينا"}
          </h1>

          <p
            style={{
              color: "#64748b",
              lineHeight: 1.9,
            }}
          >
            {detailed
              ? "أول ما تسجل الاسم والموبايل بنحفظ بيانات التواصل، وبعدها تقدر تضيف أي تفاصيل تحبها. لو خرجت قبل ما تكمل نقدر نساعدك."
              : "اكتب اسمك ورقم موبايلك فقط، وإحنا هنتواصل معاك ونسألك عن الخدمة والعنوان والموعد."}
          </p>

          <div
            className="grid2"
            style={{
              marginTop: 16,
            }}
          >
            <label className="field">
              <span>
                الاسم *
              </span>
              <input
                value={name}
                autoComplete="name"
                placeholder="اسمك"
                onChange={(
                  event,
                ) =>
                  setName(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label className="field">
              <span>
                رقم الموبايل *
              </span>
              <input
                value={phone}
                autoComplete="tel"
                inputMode="numeric"
                placeholder="01xxxxxxxxx"
                onChange={(
                  event,
                ) =>
                  setPhone(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <div
            style={{
              marginTop: 12,
              padding: 11,
              borderRadius: 11,
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              color: "#64748b",
              fontSize: 13,
              lineHeight: 1.8,
            }}
          >
            بالضغط على الزر أنت
            بتطلب من Ventic Pro
            التواصل معاك بخصوص
            الطلب ده. مش لازم
            تكتب عنوان أو إيميل
            أو موعد دلوقتي.
          </div>

          {error && (
            <div
              style={{
                marginTop: 12,
                padding: 11,
                borderRadius: 11,
                background:
                  "#fef2f2",
                border:
                  "1px solid #fecaca",
                color:
                  "#991b1b",
              }}
            >
              {error}
            </div>
          )}

          <button
            type="button"
            className="button full"
            disabled={
              saving || !valid
            }
            onClick={() =>
              void (detailed
                ? startDetailed()
                : submitQuick())
            }
            style={{
              marginTop: 14,
            }}
          >
            {saving
              ? "جاري الحفظ..."
              : detailed
                ? "ابدأ التفاصيل ←"
                : "أرسل الطلب السريع"}
          </button>

          <small
            style={{
              display: "block",
              marginTop: 10,
              color: "#64748b",
              textAlign:
                "center",
            }}
          >
            {detailed
              ? "كل البيانات بعد كده اختيارية ما عدا الاسم والموبايل."
              : "أقل وقت ممكن — اسم + موبايل فقط."}
          </small>
        </section>
      </main>
    );
  }

  return (
    <main
      className="order"
      dir="rtl"
    >
      <div className="brand center">
        <i>V</i> Ventic Pro
      </div>

      <section className="panel orderPanel">
        <div
          style={{
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          <span
            style={{
              color: "#f97316",
              fontWeight: 900,
              fontSize: 13,
            }}
          >
            اختار الأسهل ليك
          </span>
          <h1
            style={{
              marginBottom: 8,
            }}
          >
            تحب تطلب إزاي؟
          </h1>
          <p
            style={{
              color: "#64748b",
              lineHeight: 1.9,
              margin: 0,
            }}
          >
            مفيش فورم إجباري طويل.
            اختار الطريقة اللي تريحك.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(250px,1fr))",
            gap: 14,
          }}
        >
          <button
            type="button"
            onClick={() => {
              setChoice("quick");
              setMode("quick");
              router.replace(
                urlWithMode(
                  "quick",
                ),
              );
            }}
            style={{
              textAlign: "right",
              background:
                "#fff7ed",
              border:
                "2px solid #fdba74",
              borderRadius: 18,
              padding: 20,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <span
              style={{
                fontSize: 28,
              }}
            >
              ⚡
            </span>
            <h2
              style={{
                margin:
                  "10px 0 6px",
                color: "#9a3412",
              }}
            >
              طلب سريع
            </h2>
            <p
              style={{
                margin: 0,
                color: "#7c2d12",
                lineHeight: 1.8,
              }}
            >
              اكتب اسمك ورقم
              موبايلك فقط. إحنا
              هنتصل بيك ونكمل
              الخدمة والعنوان
              والموعد معاك.
            </p>
            <strong
              style={{
                display: "block",
                marginTop: 14,
                color: "#ea580c",
              }}
            >
              مناسب لو مستعجل أو
              مش عايز تملى تفاصيل ←
            </strong>
          </button>

          <button
            type="button"
            onClick={() => {
              setChoice(
                "detailed",
              );
            }}
            style={{
              textAlign: "right",
              background:
                "#f8fbff",
              border:
                "2px solid #bfdbfe",
              borderRadius: 18,
              padding: 20,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            <span
              style={{
                fontSize: 28,
              }}
            >
              📝
            </span>
            <h2
              style={{
                margin:
                  "10px 0 6px",
                color: "#0f2d4a",
              }}
            >
              طلب بالتفاصيل
            </h2>
            <p
              style={{
                margin: 0,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
              اختار الأماكن
              والخدمات، وأضف صور
              أو عنوان أو موعد لو
              حابب. الاسم والموبايل
              فقط هما الإلزاميين.
            </p>
            <strong
              style={{
                display: "block",
                marginTop: 14,
                color: "#075985",
              }}
            >
              مناسب لو عايز توضح
              احتياجك من البداية ←
            </strong>
          </button>
        </div>

        <div
          style={{
            marginTop: 16,
            textAlign: "center",
            color: "#64748b",
            fontSize: 13,
          }}
        >
          في الحالتين طلبك بيتسجل
          ونقدر نتابع معاك.
        </div>
      </section>
    </main>
  );
}
