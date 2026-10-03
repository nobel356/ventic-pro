"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties } from "react";

type MaterialItem = {
  id: string;
  sku: string;
  nameAr: string;
  unit: string;
  balance: number;
};

type UsageItem = {
  id: string;
  itemName: string;
  sku: string;
  unit: string;
  quantity: number;
  note: string;
  createdAt: string;
};

type MaterialData = {
  order: {
    id: string;
    orderNo: string;
    customerName: string;
    status: string;
  };
  items: MaterialItem[];
  usage: UsageItem[];
  confirmed: boolean;
  confirmedNone: boolean;
};

export default function Job() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [otp, setOtp] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [materials, setMaterials] =
    useState<MaterialData | null>(null);
  const [materialItemId, setMaterialItemId] =
    useState("");
  const [materialQty, setMaterialQty] =
    useState("");
  const [materialNote, setMaterialNote] =
    useState("");
  const [loading, setLoading] = useState(false);

  async function loadMaterials() {
    try {
      const response = await fetch(
        `/api/technician/orders/${params.id}/materials`,
        { cache: "no-store" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "تعذر تحميل الخامات",
        );
      }

      setMaterials(data);
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تحميل الخامات",
      );
    }
  }

  useEffect(() => {
    void loadMaterials();
  }, [params.id]);

  async function upload(
    kind: string,
    file: File | null,
  ) {
    setError("");
    setMsg("");

    if (!file) {
      setError("اختر صورة أولاً");
      return;
    }

    const form = new FormData();
    form.append("kind", kind);
    form.append("file", file);

    setLoading(true);

    try {
      const response = await fetch(
        `/api/technician/orders/${params.id}/attachments`,
        {
          method: "POST",
          body: form,
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMsg(
        kind === "BEFORE"
          ? "تم تسجيل صورة قبل التركيب."
          : "تم تسجيل صورة بعد التركيب.",
      );
    } catch (err: any) {
      setError(
        err?.message || "تعذر رفع الصورة",
      );
    } finally {
      setLoading(false);
    }
  }

  async function useMaterial() {
    setError("");
    setMsg("");

    const quantity = Number(materialQty);

    if (
      !materialItemId ||
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      setError(
        "اختر الخامة واكتب الكمية المستخدمة.",
      );
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(
        `/api/technician/orders/${params.id}/materials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            itemId: materialItemId,
            quantity,
            note: materialNote,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMaterialQty("");
      setMaterialNote("");
      setMsg(
        "تم تسجيل الخامة وخصمها تلقائيًا من عهدتك وربطها بالأوردر.",
      );
      await loadMaterials();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تسجيل الخامة",
      );
    } finally {
      setLoading(false);
    }
  }

  async function confirmNoMaterials() {
    setError("");
    setMsg("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/technician/orders/${params.id}/materials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            confirmNone: true,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMsg(
        "تم تأكيد عدم استخدام خامات في هذا الطلب.",
      );
      await loadMaterials();
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر تأكيد الخامات",
      );
    } finally {
      setLoading(false);
    }
  }

  async function issue() {
    setError("");
    setMsg("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/technician/orders/${params.id}/otp`,
        { method: "POST" },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMsg(
        `${data.message}${
          data.demoOtp
            ? ` كود التجربة: ${data.demoOtp}`
            : ""
        }`,
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إصدار كود الإتمام",
      );
    } finally {
      setLoading(false);
    }
  }

  async function complete() {
    setError("");
    setMsg("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/technician/orders/${params.id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ otp }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error);
      }

      setMsg(
        `✓ تم إغلاق الطلب. الفاتورة متزامنة والضمان مفعل حتى ${new Date(
          data.warrantyEndsAt,
        ).toLocaleDateString("ar-EG")}.`,
      );

      window.setTimeout(() => {
        router.push("/technician");
      }, 1200);
    } catch (err: any) {
      setError(
        err?.message ||
          "تعذر إتمام الطلب",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="order" dir="rtl">
      <section
        className="panel"
        style={{ maxWidth: 900 }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ marginBottom: 5 }}>
              تنفيذ الطلب{" "}
              {materials?.order.orderNo || ""}
            </h1>
            <p style={{ marginTop: 0 }}>
              {materials?.order.customerName ||
                "توثيق التركيب والخامات والإتمام"}
            </p>
          </div>

          <Link
            href="/technician"
            className="outline"
          >
            طلباتي
          </Link>
        </div>

        <div style={progressGridStyle}>
          <Step
            n="1"
            title="قبل التركيب"
            done={false}
          />
          <Step
            n="2"
            title="الخامات"
            done={Boolean(
              materials?.confirmed,
            )}
          />
          <Step
            n="3"
            title="بعد التركيب"
            done={false}
          />
          <Step
            n="4"
            title="تأكيد العميل"
            done={false}
          />
        </div>

        <div style={sectionStyle}>
          <h2>1. صورة قبل التركيب</h2>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) =>
              setBefore(
                e.target.files?.[0] || null,
              )
            }
          />
          <button
            className="outlineBtn"
            disabled={loading}
            onClick={() =>
              void upload("BEFORE", before)
            }
          >
            تسجيل صورة قبل
          </button>
        </div>

        <div style={sectionStyle}>
          <h2>2. الخامات المستخدمة</h2>
          <p style={mutedStyle}>
            سجل الخامة هنا مرة واحدة فقط؛ يتم خصمها من عهدتك وربطها بالأوردر والتقارير تلقائيًا.
          </p>

          {materials?.usage.length ? (
            <div
              style={{
                display: "grid",
                gap: 8,
                marginBottom: 14,
              }}
            >
              {materials.usage.map(
                (usage) => (
                  <div
                    key={usage.id}
                    style={usageStyle}
                  >
                    <strong>
                      {usage.itemName}
                    </strong>
                    <span>
                      {usage.quantity}{" "}
                      {usage.unit}
                    </span>
                    <small>
                      {usage.note ||
                        "بدون ملاحظة"}
                    </small>
                  </div>
                ),
              )}
            </div>
          ) : materials?.confirmedNone ? (
            <div style={successInlineStyle}>
              تم تأكيد عدم استخدام خامات.
            </div>
          ) : null}

          {!materials?.confirmedNone && (
            <>
              <div style={materialGridStyle}>
                <select
                  value={materialItemId}
                  onChange={(e) =>
                    setMaterialItemId(
                      e.target.value,
                    )
                  }
                  style={inputStyle}
                >
                  <option value="">
                    اختر من عهدتك
                  </option>
                  {(materials?.items || []).map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.sku} —{" "}
                        {item.nameAr} — متاح{" "}
                        {item.balance}{" "}
                        {item.unit}
                      </option>
                    ),
                  )}
                </select>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={materialQty}
                  onChange={(e) =>
                    setMaterialQty(
                      e.target.value,
                    )
                  }
                  placeholder="الكمية"
                  style={inputStyle}
                />

                <input
                  value={materialNote}
                  onChange={(e) =>
                    setMaterialNote(
                      e.target.value,
                    )
                  }
                  placeholder="ملاحظة اختيارية"
                  style={inputStyle}
                />

                <button
                  type="button"
                  className="button"
                  disabled={loading}
                  onClick={() =>
                    void useMaterial()
                  }
                >
                  تسجيل استخدام الخامة
                </button>
              </div>

              {!materials?.usage.length && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() =>
                    void confirmNoMaterials()
                  }
                  style={secondaryButtonStyle}
                >
                  لم أستخدم خامات في هذا الطلب
                </button>
              )}
            </>
          )}
        </div>

        <div style={sectionStyle}>
          <h2>3. صورة بعد التركيب</h2>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) =>
              setAfter(
                e.target.files?.[0] || null,
              )
            }
          />
          <button
            className="outlineBtn"
            disabled={loading}
            onClick={() =>
              void upload("AFTER", after)
            }
          >
            تسجيل صورة بعد
          </button>
        </div>

        <div style={sectionStyle}>
          <h2>4. تأكيد العميل والإغلاق</h2>
          <p style={mutedStyle}>
            إصدار الكود متاح فقط بعد الصور وتأكيد الخامات. عند الإتمام تتم مزامنة الفاتورة وتفعيل الضمان تلقائيًا.
          </p>

          <button
            className="ghostBtn"
            disabled={loading}
            onClick={() => void issue()}
          >
            إصدار كود OTP
          </button>

          <input
            inputMode="numeric"
            maxLength={6}
            placeholder="أدخل الكود المكون من 6 أرقام"
            value={otp}
            onChange={(e) =>
              setOtp(
                e.target.value.replace(
                  /\D/g,
                  "",
                ),
              )
            }
            style={{
              ...inputStyle,
              marginTop: 10,
            }}
          />

          <button
            className="button full"
            disabled={
              loading || otp.length !== 6
            }
            onClick={() => void complete()}
            style={{ marginTop: 10 }}
          >
            تأكيد وإنهاء التركيب
          </button>
        </div>

        {msg && (
          <div style={successStyle}>
            {msg}
          </div>
        )}

        {error && (
          <div style={errorStyle}>
            {error}
          </div>
        )}
      </section>
    </main>
  );
}

function Step({
  n,
  title,
  done,
}: {
  n: string;
  title: string;
  done: boolean;
}) {
  return (
    <div
      style={{
        border: `1px solid ${
          done ? "#bbf7d0" : "#e2e8f0"
        }`,
        background: done
          ? "#f0fdf4"
          : "#f8fafc",
        borderRadius: 12,
        padding: 10,
      }}
    >
      <b
        style={{
          color: done
            ? "#166534"
            : "#0f2d4a",
        }}
      >
        {done ? "✓" : n}. {title}
      </b>
    </div>
  );
}

const progressGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(150px,1fr))",
  gap: 8,
  margin: "18px 0",
};

const sectionStyle: CSSProperties = {
  border: "1px solid #e2e8f0",
  borderRadius: 14,
  padding: 16,
  marginTop: 14,
  background: "white",
  display: "grid",
  gap: 10,
};

const materialGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit,minmax(160px,1fr))",
  gap: 8,
};

const inputStyle: CSSProperties = {
  minHeight: 44,
  width: "100%",
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  padding: "0 11px",
  boxSizing: "border-box",
  font: "inherit",
  background: "white",
};

const mutedStyle: CSSProperties = {
  color: "#64748b",
  margin: 0,
  lineHeight: 1.6,
};

const usageStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(150px,1fr) auto",
  gap: 8,
  border: "1px solid #dbeafe",
  borderRadius: 10,
  padding: 10,
  background: "#f8fbff",
};

const secondaryButtonStyle: CSSProperties = {
  width: "fit-content",
  minHeight: 40,
  border: "1px solid #cbd5e1",
  borderRadius: 10,
  background: "white",
  color: "#0f2d4a",
  padding: "0 13px",
  fontWeight: 800,
  cursor: "pointer",
};

const successInlineStyle: CSSProperties = {
  padding: 10,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const successStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: "#f0fdf4",
  border: "1px solid #bbf7d0",
  color: "#166534",
};

const errorStyle: CSSProperties = {
  marginTop: 14,
  padding: 12,
  borderRadius: 10,
  background: "#fef2f2",
  border: "1px solid #fecaca",
  color: "#991b1b",
};
