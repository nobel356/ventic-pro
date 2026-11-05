"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Control = {
  mode:
    | "NORMAL"
    | "LEAD_ONLY"
    | "MAINTENANCE";
  leadCapture: boolean;
  detailedOrders: boolean;
  customerAccounts: boolean;
  accountRegistration: boolean;
  phoneOtp: boolean;
  emailOtpRecovery: boolean;
  estimates: boolean;
  coupons: boolean;
  referrals: boolean;
  uploads: boolean;
  reviews: boolean;
  aftercare: boolean;
  portfolio: boolean;
  notifications: boolean;
  marketingTracking: boolean;
  fallbackWhatsapp: string;
  supportPhone: string;
  maintenanceMessage: string;
  leadSuccessMessage: string;
};

const toggleGroups = [
  {
    title: "الحد الأدنى الذي لا يجب أن يتوقف",
    items: [
      ["leadCapture", "تسجيل الاسم + الموبايل", "المسار الأساسي لاستقبال أي عميل حتى لو باقي النظام متوقف."],
    ],
  },
  {
    title: "رحلة الطلب",
    items: [
      ["detailedOrders", "الطلب التفصيلي", "تشغيل/إيقاف النموذج الكامل للطلب."],
      ["estimates", "التسعير التقديري", "إظهار وحساب التقدير التلقائي."],
      ["coupons", "الكوبونات", "السماح بتطبيق أكواد الخصم."],
      ["referrals", "الإحالات", "تفعيل أكواد وروابط الإحالة."],
      ["uploads", "رفع الصور", "السماح برفع صور الطلب."],
    ],
  },
  {
    title: "حساب العميل والرسائل",
    items: [
      ["customerAccounts", "بوابة حساب العميل", "تشغيل الدخول والوصول لحساب العميل."],
      ["accountRegistration", "إنشاء/تفعيل حساب جديد", "اتركه مغلقًا لحين جاهزية وسيلة تحقق موثوقة."],
      ["phoneOtp", "OTP على الموبايل", "فعّله فقط بعد ربط مزود SMS/WhatsApp فعلي."],
      ["emailOtpRecovery", "OTP على الإيميل للاسترجاع", "مخصص لاسترجاع حسابات موجودة ومثبتة."],
      ["notifications", "الإشعارات", "إرسال/تسجيل الإشعارات التشغيلية."],
    ],
  },
  {
    title: "الموديولات العامة",
    items: [
      ["reviews", "التقييمات", "عرض واستقبال تقييمات العملاء."],
      ["aftercare", "الصيانة والشكاوى", "تشغيل خدمات ما بعد البيع."],
      ["portfolio", "فيديوهات الأعمال", "إظهار معرض الأعمال."],
      ["marketingTracking", "التتبع التسويقي", "UTM/attribution والأحداث التسويقية."],
    ],
  },
] as const;

export default function ControlCenterClient() {
  const [control, setControl] =
    useState<Control | null>(null);
  const [loading, setLoading] =
    useState(true);
  const [saving, setSaving] =
    useState(false);
  const [message, setMessage] =
    useState("");
  const [degraded, setDegraded] =
    useState(false);

  useEffect(() => {
    fetch("/api/admin/runtime-controls", {
      cache: "no-store",
    })
      .then(async (response) => {
        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data?.error ||
              "تعذر تحميل الإعدادات",
          );
        }

        setControl(data.control);
        setDegraded(
          Boolean(data.degraded),
        );
      })
      .catch((error) => {
        setMessage(
          error?.message ||
            "تعذر تحميل الإعدادات",
        );
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const leadSafety = useMemo(
    () =>
      Boolean(
        control?.leadCapture,
      ),
    [control],
  );

  function set<K extends keyof Control>(
    key: K,
    value: Control[K],
  ) {
    setControl((current) =>
      current
        ? {
            ...current,
            [key]: value,
          }
        : current,
    );
  }

  async function save() {
    if (!control) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/runtime-controls",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(control),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر الحفظ",
        );
      }

      setControl(data.control);
      setMessage(
        "تم حفظ وضع التشغيل بنجاح.",
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر حفظ الإعدادات",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div dir="rtl">
        جاري تحميل Control Center...
      </div>
    );
  }

  if (!control) {
    return (
      <div dir="rtl">
        {message ||
          "تعذر تحميل Control Center."}
      </div>
    );
  }

  return (
    <main
      dir="rtl"
      style={{
        maxWidth: 1100,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              color: "#0b2f49",
            }}
          >
            Control Center
          </h1>
          <p
            style={{
              margin:
                "8px 0 0",
              color: "#64748b",
            }}
          >
            شغّل واقفل أجزاء الموقع
            بدون تعديل كود أو Deploy.
          </p>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={saving}
          style={{
            border: 0,
            borderRadius: 12,
            padding: "12px 20px",
            fontWeight: 800,
            cursor: "pointer",
            background: "#0b2f49",
            color: "white",
          }}
        >
          {saving
            ? "جاري الحفظ..."
            : "حفظ الإعدادات"}
        </button>
      </div>

      {degraded ? (
        <div style={warning}>
          تعذر قراءة إعدادات التشغيل
          من قاعدة البيانات، والنظام
          دخل تلقائيًا في Lead-only
          fail-safe.
        </div>
      ) : null}

      {!leadSafety ? (
        <div style={danger}>
          تحذير: أنت أوقفت تسجيل
          الاسم والموبايل. لو حصل عطل
          في أي جزء آخر لن يبقى عندك
          fallback لاستقبال العميل.
        </div>
      ) : null}

      <section style={card}>
        <h2 style={sectionTitle}>
          وضع الموقع
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit,minmax(220px,1fr))",
            gap: 12,
          }}
        >
          {[
            [
              "NORMAL",
              "Normal",
              "كل الموديولات حسب التoggles.",
            ],
            [
              "LEAD_ONLY",
              "Lead Only",
              "اسم + رقم فقط، وإيقاف الرحلة الكاملة.",
            ],
            [
              "MAINTENANCE",
              "Maintenance",
              "إظهار رسالة صيانة مع إبقاء وسيلة التواصل.",
            ],
          ].map(
            ([value, label, desc]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  set(
                    "mode",
                    value as Control["mode"],
                  )
                }
                style={{
                  padding: 16,
                  borderRadius: 14,
                  border:
                    control.mode ===
                    value
                      ? "2px solid #0b2f49"
                      : "1px solid #dbe4ea",
                  background:
                    control.mode ===
                    value
                      ? "#eef6fb"
                      : "white",
                  textAlign: "right",
                  cursor: "pointer",
                }}
              >
                <strong>{label}</strong>
                <div
                  style={{
                    marginTop: 6,
                    color: "#64748b",
                    lineHeight: 1.6,
                    fontSize: 13,
                  }}
                >
                  {desc}
                </div>
              </button>
            ),
          )}
        </div>
      </section>

      {toggleGroups.map((group) => (
        <section
          key={group.title}
          style={card}
        >
          <h2 style={sectionTitle}>
            {group.title}
          </h2>

          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            {group.items.map(
              ([key, label, desc]) => {
                const checked =
                  Boolean(
                    control[
                      key as keyof Control
                    ],
                  );

                return (
                  <label
                    key={key}
                    style={toggleRow}
                  >
                    <div>
                      <strong>
                        {label}
                      </strong>
                      <div
                        style={{
                          color:
                            "#64748b",
                          marginTop: 4,
                          fontSize: 13,
                          lineHeight:
                            1.6,
                        }}
                      >
                        {desc}
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        set(
                          key as keyof Control,
                          event.target
                            .checked as never,
                        )
                      }
                      style={{
                        width: 22,
                        height: 22,
                      }}
                    />
                  </label>
                );
              },
            )}
          </div>
        </section>
      ))}

      <section style={card}>
        <h2 style={sectionTitle}>
          التواصل والرسائل البديلة
        </h2>

        <Field
          label="رقم واتساب للطوارئ"
          value={
            control.fallbackWhatsapp
          }
          onChange={(value) =>
            set(
              "fallbackWhatsapp",
              value,
            )
          }
        />

        <Field
          label="رقم الدعم الظاهر"
          value={
            control.supportPhone
          }
          onChange={(value) =>
            set(
              "supportPhone",
              value,
            )
          }
        />

        <Field
          label="رسالة وضع الصيانة"
          value={
            control.maintenanceMessage
          }
          onChange={(value) =>
            set(
              "maintenanceMessage",
              value,
            )
          }
          multiline
        />

        <Field
          label="رسالة نجاح تسجيل العميل"
          value={
            control.leadSuccessMessage
          }
          onChange={(value) =>
            set(
              "leadSuccessMessage",
              value,
            )
          }
          multiline
        />
      </section>

      {message ? (
        <div style={notice}>
          {message}
        </div>
      ) : null}
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  multiline?: boolean;
}) {
  return (
    <label
      style={{
        display: "grid",
        gap: 7,
        marginBottom: 14,
      }}
    >
      <strong>{label}</strong>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          rows={3}
          style={input}
        />
      ) : (
        <input
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          style={input}
        />
      )}
    </label>
  );
}

const card: React.CSSProperties = {
  background: "white",
  border:
    "1px solid #e2e8f0",
  borderRadius: 18,
  padding: 20,
  marginBottom: 16,
  boxShadow:
    "0 8px 28px rgba(15,23,42,.05)",
};

const sectionTitle: React.CSSProperties = {
  marginTop: 0,
  color: "#0b2f49",
};

const toggleRow: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent:
    "space-between",
  gap: 16,
  padding: 14,
  borderRadius: 14,
  border:
    "1px solid #e2e8f0",
};

const input: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border:
    "1px solid #cbd5e1",
  borderRadius: 12,
  padding: "10px 12px",
  font: "inherit",
};

const warning: React.CSSProperties = {
  background: "#fff7ed",
  border:
    "1px solid #fdba74",
  color: "#9a3412",
  padding: 14,
  borderRadius: 12,
  marginBottom: 14,
};

const danger: React.CSSProperties = {
  background: "#fef2f2",
  border:
    "1px solid #fca5a5",
  color: "#991b1b",
  padding: 14,
  borderRadius: 12,
  marginBottom: 14,
};

const notice: React.CSSProperties = {
  background: "#ecfdf5",
  border:
    "1px solid #86efac",
  color: "#166534",
  padding: 14,
  borderRadius: 12,
  marginBottom: 20,
};
