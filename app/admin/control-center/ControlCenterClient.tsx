"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  RUNTIME_PENDING_LEADS_KEY,
  enqueueRuntimePendingLead,
  readRuntimePendingLeads,
} from "@/lib/runtime-lead-queue";

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
  const [leadHealthRunning, setLeadHealthRunning] =
    useState(false);
  const [journeyRunning, setJourneyRunning] =
    useState(false);
  const [journeyHealth, setJourneyHealth] =
    useState<{
      ok: boolean;
      customerOwnOrder?: boolean;
      crossCustomerDenied?: boolean;
      archivedCustomerDenied?: boolean;
      technicianOwnOrder?: boolean;
      wrongTechnicianDenied?: boolean;
      archivedTechnicianDenied?: boolean;
      correctDeviceAccepted?: boolean;
      wrongPropertyDeviceDenied?: boolean;
      otherCustomerDeviceDenied?: boolean;
      activeInvoiceVisible?: boolean;
      archivedInvoiceDenied?: boolean;
      roleBoundaries?: boolean;
      rollbackCleanup?: boolean;
      durationMs?: number;
      error?: string;
    } | null>(null);

  const [resilienceRunning, setResilienceRunning] =
    useState(false);
  const [resilienceHealth, setResilienceHealth] =
    useState<{
      ok: boolean;
      runtimeFailSafe?: boolean;
      runtimeMode?: string;
      leadCapturePreserved?: boolean;
      nonessentialFeaturesDisabled?: boolean;
      leadWritten?: boolean;
      notificationFailureIsolated?: boolean;
      leadSurvivedNotificationFailure?: boolean;
      localQueue?: boolean;
      cleanup?: boolean;
      durationMs?: number;
      error?: string;
    } | null>(null);
  const [leadHealth, setLeadHealth] =
    useState<{
      ok: boolean;
      write?: boolean;
      read?: boolean;
      adminVisible?: boolean;
      cleanup?: boolean;
      legacyQuickContactAlias?: string;
      durationMs?: number;
      error?: string;
    } | null>(null);

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

  async function applyMode(
    mode: Control["mode"],
  ) {
    if (!control || saving) {
      return;
    }

    const next = {
      ...control,
      mode,
    };

    setControl(next);
    setSaving(true);
    setMessage(
      "جاري تطبيق وضع الموقع...",
    );

    try {
      const response = await fetch(
        "/api/admin/runtime-controls",
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body:
            JSON.stringify(next),
        },
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تطبيق وضع الموقع",
        );
      }

      setControl(data.control);
      setMessage(
        mode === "NORMAL"
          ? "تم تشغيل الموقع بالكامل الآن."
          : mode === "LEAD_ONLY"
            ? "تم تطبيق Lead Only الآن على الموقع العام."
            : "تم وضع الموقع العام في الصيانة الآن.",
      );
    } catch (error: any) {
      setMessage(
        error?.message ||
          "تعذر تطبيق وضع الموقع",
      );
    } finally {
      setSaving(false);
    }
  }

  async function runJourneyHealth() {
    if (journeyRunning) {
      return;
    }

    setJourneyRunning(true);
    setJourneyHealth(null);

    try {
      const response =
        await fetch(
          "/api/admin/journey-health",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );

      const data =
        await response.json();

      setJourneyHealth(data);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "فشل اختبار Customer Journey",
        );
      }
    } catch (error: any) {
      setJourneyHealth({
        ok: false,
        error:
          error?.message ||
          "فشل اختبار Customer Journey",
      });
    } finally {
      setJourneyRunning(false);
    }
  }

  async function runResilienceHealth() {
    if (resilienceRunning) {
      return;
    }

    setResilienceRunning(true);
    setResilienceHealth(null);

    let localQueue = false;
    let previousRaw: string | null = null;

    try {
      previousRaw =
        localStorage.getItem(
          RUNTIME_PENDING_LEADS_KEY,
        );

      const marker =
        `V20V_LOCAL_${Date.now()}`;

      enqueueRuntimePendingLead(
        localStorage,
        {
          marker,
          noContact: true,
        },
      );

      localQueue =
        readRuntimePendingLeads(
          localStorage,
        ).some(
          (item: any) =>
            item?.marker === marker,
        );

      if (!localQueue) {
        throw new Error(
          "LOCAL_QUEUE_ROUNDTRIP_FAILED",
        );
      }

      const response =
        await fetch(
          "/api/admin/resilience-health",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "فشل اختبار Resilience",
        );
      }

      setResilienceHealth({
        ...data,
        localQueue,
      });
    } catch (error: any) {
      setResilienceHealth({
        ok: false,
        localQueue,
        error:
          error?.message ||
          "فشل اختبار Resilience",
      });
    } finally {
      try {
        if (previousRaw === null) {
          localStorage.removeItem(
            RUNTIME_PENDING_LEADS_KEY,
          );
        } else {
          localStorage.setItem(
            RUNTIME_PENDING_LEADS_KEY,
            previousRaw,
          );
        }
      } catch {
        // Diagnostic cleanup must not break Control Center.
      }

      setResilienceRunning(false);
    }
  }

  async function runLeadHealth() {
    if (leadHealthRunning) {
      return;
    }

    setLeadHealthRunning(true);
    setLeadHealth(null);

    try {
      const response =
        await fetch(
          "/api/admin/lead-health",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
          },
        );

      const data =
        await response.json();

      setLeadHealth(data);

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "فشل اختبار Lead Capture",
        );
      }
    } catch (error: any) {
      setLeadHealth({
        ok: false,
        error:
          error?.message ||
          "فشل اختبار Lead Capture",
      });
    } finally {
      setLeadHealthRunning(false);
    }
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
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={sectionTitle}>
              Lead Capture Health
            </h2>
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              اختبار آمن: كتابة Lead تجريبي في قاعدة البيانات، قراءته، التأكد أنه يطابق شروط لوحة Leads، ثم حذفه فورًا.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void runLeadHealth()
            }
            disabled={
              leadHealthRunning
            }
            style={{
              border: 0,
              borderRadius: 12,
              padding:
                "11px 16px",
              background:
                "#0b2f49",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {leadHealthRunning
              ? "جاري الاختبار..."
              : "اختبار Lead Capture"}
          </button>
        </div>

        {leadHealth ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              border: leadHealth.ok
                ? "1px solid #86efac"
                : "1px solid #fca5a5",
              background:
                leadHealth.ok
                  ? "#f0fdf4"
                  : "#fef2f2",
              color:
                leadHealth.ok
                  ? "#166534"
                  : "#991b1b",
              lineHeight: 1.8,
              fontWeight: 800,
            }}
          >
            {leadHealth.ok ? (
              <>
                PASS ✓ — DB Write ✓ / Read ✓ / Admin Visibility ✓ / Cleanup ✓ / Legacy QUICK_CONTACT → {leadHealth.legacyQuickContactAlias} ✓
                {typeof leadHealth.durationMs === "number"
                  ? ` — ${leadHealth.durationMs} ms`
                  : ""}
              </>
            ) : (
              <>
                FAIL — {leadHealth.error || "Unknown error"}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={sectionTitle}>
              Customer Journey Integrity
            </h2>
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              اختبار عزل العميل والفني والأرشيف وربط الجهاز بالطلب والعقار داخل Transaction يتم عمل Rollback لها بالكامل.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void runJourneyHealth()
            }
            disabled={
              journeyRunning
            }
            style={{
              border: 0,
              borderRadius: 12,
              padding:
                "11px 16px",
              background:
                "#1d4ed8",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {journeyRunning
              ? "جاري اختبار المسار..."
              : "اختبار Customer Journey"}
          </button>
        </div>

        {journeyHealth ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              border:
                journeyHealth.ok
                  ? "1px solid #86efac"
                  : "1px solid #fca5a5",
              background:
                journeyHealth.ok
                  ? "#f0fdf4"
                  : "#fef2f2",
              color:
                journeyHealth.ok
                  ? "#166534"
                  : "#991b1b",
              lineHeight: 1.8,
              fontWeight: 800,
            }}
          >
            {journeyHealth.ok ? (
              <>
                PASS ✓ — Customer Isolation ✓ / Archive Isolation ✓ / Technician Isolation ✓ / Device-Order Binding ✓ / Invoice Isolation ✓ / Role Boundaries ✓ / Rollback Cleanup ✓
                {typeof journeyHealth.durationMs === "number"
                  ? ` — ${journeyHealth.durationMs} ms`
                  : ""}
              </>
            ) : (
              <>
                FAIL — {journeyHealth.error || "Unknown error"}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section style={card}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent:
              "space-between",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2 style={sectionTitle}>
              Resilience Failure Lab
            </h2>
            <div
              style={{
                color: "#64748b",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              محاكاة آمنة لفشل Runtime DB والإشعارات وOffline Queue بدون تعطيل Production أو التواصل مع أي عميل.
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void runResilienceHealth()
            }
            disabled={
              resilienceRunning
            }
            style={{
              border: 0,
              borderRadius: 12,
              padding:
                "11px 16px",
              background:
                "#7c2d12",
              color: "white",
              fontWeight: 900,
              cursor: "pointer",
            }}
          >
            {resilienceRunning
              ? "جاري محاكاة الأعطال..."
              : "تشغيل Failure Lab"}
          </button>
        </div>

        {resilienceHealth ? (
          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 12,
              border:
                resilienceHealth.ok &&
                resilienceHealth.localQueue
                  ? "1px solid #86efac"
                  : "1px solid #fca5a5",
              background:
                resilienceHealth.ok &&
                resilienceHealth.localQueue
                  ? "#f0fdf4"
                  : "#fef2f2",
              color:
                resilienceHealth.ok &&
                resilienceHealth.localQueue
                  ? "#166534"
                  : "#991b1b",
              lineHeight: 1.8,
              fontWeight: 800,
            }}
          >
            {resilienceHealth.ok &&
            resilienceHealth.localQueue ? (
              <>
                PASS ✓ — Runtime DB Fail-safe ✓ / Lead Capture Preserved ✓ / Nonessential Features OFF ✓ / Lead Survives Notification Failure ✓ / Offline Queue ✓ / Cleanup ✓
                {typeof resilienceHealth.durationMs === "number"
                  ? ` — ${resilienceHealth.durationMs} ms`
                  : ""}
              </>
            ) : (
              <>
                FAIL — {resilienceHealth.error || "Unknown error"}
              </>
            )}
          </div>
        ) : null}
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>
          وضع الموقع
        </h2>
        <div
          style={{
            margin: "-4px 0 14px",
            color: "#475569",
            fontSize: 13,
            fontWeight: 800,
          }}
        >
          الوضع الحالي المطبق فعليًا:{" "}
          <strong>
            {control.mode}
          </strong>
          {" "}— تغيير الوضع من الأزرار أدناه يطبق فورًا.
        </div>

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
                  void applyMode(
                    value as Control["mode"],
                  )
                }
                disabled={saving}
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
                  <div
                    key={key}
                    style={{
                      ...toggleRow,
                      border: checked
                        ? "1px solid #86efac"
                        : "1px solid #cbd5e1",
                      background: checked
                        ? "#f0fdf4"
                        : "#f8fafc",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong>
                          {label}
                        </strong>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            borderRadius: 999,
                            padding: "3px 9px",
                            fontSize: 12,
                            fontWeight: 900,
                            background: checked
                              ? "#dcfce7"
                              : "#e2e8f0",
                            color: checked
                              ? "#166534"
                              : "#475569",
                          }}
                        >
                          {checked
                            ? "● شغال"
                            : "○ مقفول"}
                        </span>
                      </div>
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

                    <button
                      type="button"
                      role="switch"
                      aria-checked={checked}
                      aria-label={`${label}: ${checked ? "شغال" : "مقفول"}`}
                      onClick={() =>
                        set(
                          key as keyof Control,
                          (!checked) as never,
                        )
                      }
                      style={{
                        position: "relative",
                        flex: "0 0 auto",
                        width: 68,
                        height: 36,
                        borderRadius: 999,
                        border: checked
                          ? "2px solid #16a34a"
                          : "2px solid #94a3b8",
                        background: checked
                          ? "#22c55e"
                          : "#cbd5e1",
                        cursor: "pointer",
                        transition:
                          "background .18s ease, border-color .18s ease",
                        boxShadow:
                          "inset 0 1px 2px rgba(15,23,42,.12)",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          position: "absolute",
                          top: 3,
                          left: checked
                            ? 33
                            : 3,
                          width: 26,
                          height: 26,
                          borderRadius: "50%",
                          background: "white",
                          boxShadow:
                            "0 2px 6px rgba(15,23,42,.28)",
                          transition:
                            "left .18s ease",
                        }}
                      />
                    </button>
                  </div>
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
