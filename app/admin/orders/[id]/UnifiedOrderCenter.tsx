"use client";

import { useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";

type Step = {
  key: string;
  label: string;
  detail: string;
  state: "DONE" | "ACTION" | "WAIT" | "INFO";
  anchor?: string;
};

type Props = {
  orderId: string;
  steps: Step[];
  finance: {
    source: string;
    authoritative: boolean;
    baseSubtotal: number;
    approvedExtras: number;
    discount: number;
    total: number;
    paid: number;
    due: number;
  };
  invoice: {
    id: string;
    invoiceNo: string;
    total: number;
    paid: number;
    due: number;
  } | null;
  invoiceNeedsSync: boolean;
};

const paymentMethods = [
  ["CASH", "نقدي"],
  ["CARD", "بطاقة"],
  ["BANK_TRANSFER", "تحويل بنكي"],
  ["WALLET", "محفظة إلكترونية"],
  ["OTHER", "أخرى"],
];

export default function UnifiedOrderCenter({
  orderId,
  steps,
  finance,
  invoice,
  invoiceNeedsSync,
}: Props) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [reference, setReference] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function recordPayment() {
    setMessage("");
    setError("");

    const numeric = Number(amount);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("اكتب قيمة دفعة صحيحة.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          amount: numeric,
          method,
          reference,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "تعذر تسجيل الدفعة",
        );
      }

      setAmount("");
      setReference("");
      setMessage(
        data?.invoice
          ? `تم تسجيل الدفعة ومزامنة الفاتورة تلقائيًا. المتبقي ${Number(
              data?.financials?.due || 0,
            ).toLocaleString("ar-EG")} ج.`
          : `تم تسجيل الدفعة كمقدم. ستدخل تلقائيًا في الفاتورة بعد اعتماد مقايسة Ventic Pro.`,
      );
      router.refresh();
    } catch (err: any) {
      setError(
        err?.message || "تعذر تسجيل الدفعة",
      );
    } finally {
      setLoading(false);
    }
  }

  async function syncInvoice() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(
        `/api/invoices/${orderId}`,
        {
          method: "POST",
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر مزامنة الفاتورة",
        );
      }

      setMessage(
        "تمت مزامنة الفاتورة من المقايسة والإضافات والمدفوعات.",
      );
      router.refresh();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر مزامنة الفاتورة",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        ...cardStyle,
        border: "1px solid #bfdbfe",
        background:
          "linear-gradient(135deg,#ffffff,#f8fbff)",
      }}
    >
      <div style={headerStyle}>
        <div>
          <h2 style={{ margin: 0 }}>
            مركز تنفيذ الطلب
          </h2>
          <p style={mutedStyle}>
            شاشة واحدة توضح أين وصل الطلب وما هي الخطوة التالية. الأنظمة المرتبطة تتحدث تلقائيًا.
          </p>
        </div>

        <span style={sourceBadgeStyle}>
          المصدر المالي: {finance.source}
        </span>
      </div>

      <div style={stepsGridStyle}>
        {steps.map((step, index) => (
          <a
            key={step.key}
            href={step.anchor || "#"}
            style={{
              ...stepStyle,
              borderColor: stepColor(
                step.state,
              ).border,
              background: stepColor(
                step.state,
              ).background,
              cursor: step.anchor
                ? "pointer"
                : "default",
            }}
          >
            <span
              style={{
                ...stepNumberStyle,
                background: stepColor(
                  step.state,
                ).badge,
              }}
            >
              {index + 1}
            </span>

            <div>
              <strong
                style={{
                  display: "block",
                  color: "#0f2d4a",
                }}
              >
                {step.label}
              </strong>
              <small
                style={{
                  color: "#64748b",
                  lineHeight: 1.5,
                }}
              >
                {step.detail}
              </small>
            </div>
          </a>
        ))}
      </div>

      <div style={financeGridStyle}>
        <Finance
          label="أساس المقايسة"
          value={finance.baseSubtotal}
        />
        <Finance
          label="إضافات معتمدة"
          value={finance.approvedExtras}
        />
        <Finance
          label="الخصم"
          value={finance.discount}
        />
        <Finance
          label="إجمالي الفاتورة"
          value={finance.total}
          strong
        />
        <Finance
          label="المدفوع"
          value={finance.paid}
        />
        <Finance
          label="المتبقي"
          value={finance.due}
          danger={finance.due > 0}
          strong
        />
      </div>

      {invoice && (
        <p
          style={{
            ...mutedStyle,
            marginTop: 12,
          }}
        >
          الفاتورة الحالية:{" "}
          <strong>{invoice.invoiceNo}</strong>
        </p>
      )}

      {finance.authoritative && invoiceNeedsSync && (
        <button
          type="button"
          disabled={loading}
          onClick={() => void syncInvoice()}
          style={{
            ...secondaryButtonStyle,
            marginTop: 12,
          }}
        >
          مزامنة الفاتورة القديمة مع البيانات الحالية
        </button>
      )}

      {finance.due > 0 && (
        <div
          style={{
            borderTop:
              "1px solid #dbeafe",
            marginTop: 18,
            paddingTop: 18,
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            تسجيل دفعة من نفس الطلب
          </h3>

          <div style={paymentGridStyle}>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) =>
                setAmount(
                  event.target.value,
                )
              }
              placeholder={`المبلغ — المتبقي ${finance.due.toLocaleString(
                "ar-EG",
              )} ج`}
              style={inputStyle}
            />

            <select
              value={method}
              onChange={(event) =>
                setMethod(
                  event.target.value,
                )
              }
              style={inputStyle}
            >
              {paymentMethods.map(
                ([value, label]) => (
                  <option
                    key={value}
                    value={value}
                  >
                    {label}
                  </option>
                ),
              )}
            </select>

            <input
              value={reference}
              onChange={(event) =>
                setReference(
                  event.target.value,
                )
              }
              placeholder="مرجع الدفع (اختياري)"
              style={inputStyle}
            />

            <button
              type="button"
              disabled={loading}
              onClick={() =>
                void recordPayment()
              }
              className="button"
            >
              {loading
                ? "جاري الحفظ..."
                : "تسجيل الدفعة"}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div style={successStyle}>
          {message}
        </div>
      )}

      {error && (
        <div style={errorStyle}>
          {error}
        </div>
      )}
    </section>
  );
}

function Finance({
  label,
  value,
  strong = false,
  danger = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
  danger?: boolean;
}) {
  return (
    <div style={financeCardStyle}>
      <span
        style={{
          color: "#64748b",
          fontSize: 12,
        }}
      >
        {label}
      </span>
      <b
        style={{
          display: "block",
          marginTop: 4,
          fontSize: strong ? 20 : 17,
          color: danger
            ? "#b91c1c"
            : "#0f2d4a",
        }}
      >
        {Number(value || 0).toLocaleString(
          "ar-EG",
        )}{" "}
        ج
      </b>
    </div>
  );
}

function stepColor(state: Step["state"]) {
  if (state === "DONE") {
    return {
      background: "#f0fdf4",
      border: "#bbf7d0",
      badge: "#16a34a",
    };
  }

  if (state === "ACTION") {
    return {
      background: "#fff7ed",
      border: "#fed7aa",
      badge: "#f97316",
    };
  }

  if (state === "WAIT") {
    return {
      background: "#fffbeb",
      border: "#fde68a",
      badge: "#d97706",
    };
  }

  return {
    background: "#f8fafc",
    border: "#e2e8f0",
    badge: "#64748b",
  };
}

const cardStyle: CSSProperties = {
  borderRadius: 18,
  padding: 20,
  marginTop: 22,
  boxShadow:
    "0 10px 30px rgba(15,23,42,.05)",
};

const headerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  marginBottom: 0,
  lineHeight: 1.6,
};

const sourceBadgeStyle: CSSProperties = {
  borderRadius: 999,
  background: "#e0f2fe",
  color: "#075985",
  padding: "6px 10px",
  fontSize: 12,
  fontWeight: 800,
};

const stepsGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(210px,1fr))",
  gap: 10,
  marginTop: 18,
};

const stepStyle: CSSProperties = {
  textDecoration: "none",
  color: "inherit",
  border: "1px solid",
  borderRadius: 13,
  padding: 12,
  display: "grid",
  gridTemplateColumns: "34px 1fr",
  gap: 9,
  alignItems: "start",
};

const stepNumberStyle: CSSProperties = {
  width: 30,
  height: 30,
  display: "grid",
  placeItems: "center",
  borderRadius: 9,
  color: "white",
  fontWeight: 900,
};

const financeGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(145px,1fr))",
  gap: 9,
  marginTop: 18,
};

const financeCardStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  padding: 11,
  background: "white",
};

const paymentGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(170px,1fr))",
  gap: 9,
  alignItems: "center",
};

const inputStyle: CSSProperties = {
  minHeight: 44,
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  boxSizing: "border-box",
  background: "white",
  font: "inherit",
};

const secondaryButtonStyle: CSSProperties = {
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 13px",
  fontWeight: 800,
  cursor: "pointer",
};

const successStyle: CSSProperties = {
  marginTop: 12,
  padding: 11,
  borderRadius: 10,
  background: "#f0fdf4",
  color: "#166534",
  border: "1px solid #bbf7d0",
};

const errorStyle: CSSProperties = {
  marginTop: 12,
  padding: 11,
  borderRadius: 10,
  background: "#fef2f2",
  color: "#991b1b",
  border: "1px solid #fecaca",
};
